const rootPath = require('app-root-path');
const config = require(`${rootPath}/envs/.${process.env.NODE_ENV || 'development'}`);

const express = require('express');
const asyncify = require('express-asyncify');
const router = asyncify(express.Router());

// ORM
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require(`${rootPath}/models`);
const models = db.models;

// middleware
const reqLimit = require(`${rootPath}/middlewares/reqLimit`);
const ResData = require(`${rootPath}/middlewares/ResData`);

// libs
const reqTracer = require('cls-rtracer');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));

// utils
const jwtUtil = require(`${rootPath}/utils/jwt`);
const stringUtil = require(`${rootPath}/utils/string_utils`);

// types
const rTracer = require("cls-rtracer");

// logger
const logger = require(`${rootPath}/config/winston`)('WRS');

// Validation
const commonValidator = require(`${rootPath}/validations/common`);
const containersValidator = require(`${rootPath}/validations/containers`);


/**
 * @swagger
 * paths:
 *   /api/containers:
 *     post:
 *       tags:
 *         - Containers
 *       summary: 'Containers 자원 할당 정보 등록'
 *       description:
 *         'Containers 자원 할당 정보 등록 API 동작 설명 <br>
 *         <ul>
 *             <li>API 호출 이력 DB 저장</li>
 *             <li>해당 Coordinator 정보 중, 사용 가능한 Container 갯수를 하나 줄임 (사용가능한 Container 갯수가 마이너스가 되더라도 저장)</li>
 *             <li>Container 리소스 할당 데이터 저장</li>
 *             <li>API 호출 이력 결과 DB 업데이트</li>
 *         </ul>'
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coordinator_uuid:
 *                   type: string
 *                   description: 'WRS Server를 구분하는 값'
 *                 container_uuid:
 *                   type: string
 *                   description: '자원이 할당된 Web Container의 구분 값'
 *                 client_uuid:
 *                   type: string
 *                   description: 'Web Container와 매칭되는 Client 구분 값'
 *                 container_port_number:
 *                   type: integer
 *                   description: 'Client 연결 Websocket 포트'
 *                 video_codec:
 *                   type: string
 *                   description: 'WebRTC에서 사용할 비디오 코덱'
 *                 audio_codec:
 *                   type: string
 *                   description: 'WebRTC에서 사용할 오디오 코덱'
 *                 video_width:
 *                   type: integer
 *                   description: 'video의 가로 해상도'
 *                 video_height:
 *                   type: integer
 *                   description: 'video의 세로 해상도'
 *       responses:
 *         '200':
 *           description: 'CREATED'
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     description: '성공: success, 실패: fail'
 *                   message:
 *                     type: string
 *                     description: '에러발생이 그에 상응하는 메시지 전달'
 *                   uuid:
 *                     type: string
 *                     description: 'WRS Server를 구분하귀 위해 Backoffice에서 발급하는 고유값'
 *
 */
router.post(
    '/',
    reqLimit.apiLimiter,
    async function(req, res, next) {
        // add api_history
        const insertApiHistoryParams = {
            user_os: req.useragent.os,
            user_platform: req.useragent.platform,
            user_browser: req.useragent.browser,
            user_version: req.useragent.version,
            method: 'POST',
            request_headers: JSON.stringify(req.headers),
            api_url: req.originalUrl,
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);
        if (!req.data) {
            req.data = {};
        }
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // Joi Validation
        const validateResult = containersValidator.allocatedContainerResource(req.body);
        if (validateResult.error) {
            const err = {
                reqID: rTracer.id(),
                errUrl: req.originalUrl,
                message: validateResult.error.message,
                code: 'fail',
                queryParams: req.query,
                bodyParams: req.body,
            };
            // logger.error(JSON.stringify(err));

            const resData = {
                code: 'fail',
                message: validateResult.error.message,
            };
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }

        next();
    },
    async function(req, res, next) {
        // Data Validation
        const coordinator = await models.tb_coordinators.findOne({
            where: {
                uuid: req.body.coordinator_uuid,
                // port_num: req.body.container_port_number,
                deleted_yn: {
                    [Op.or]: [false, null]
                }
            }
        });
        if (!coordinator) {
            const resData = {
                code: 'fail',
                message: 'coordinator_uuid 와 일치하는 데이터가 존재하지 않습니다.',
            };
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }

        if (!req.data)
            req.data = {};
        req.data.coordinator = coordinator;

        next();
    },
    // jgkim delete async_await
    function(req, res) {
        // tb_coordinator 의 available_containers 하나 빼기
        try {
            req.data.coordinator.update({
                available_containers: req.data.coordinator.available_containers - 1,
            });

            // tb_containers 등록
            models.tb_containers.create({
                uuid: req.body.container_uuid,
                fk_coordinator_uuid: req.body.coordinator_uuid,
                fk_client_uuid: req.body.client_uuid,
                coordinator_port_num: req.body.container_port_number,
                video_codec: req.body.video_codec,
                audio_codec: req.body.audio_codec,
                video_width: req.body.video_width,
                video_height: req.body.video_height,
                released_yn: false
            });

            const resData = {
                code: 'success',
                message: '',
            }
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        } catch (error) {
            const resData = {
                code: 'fail',
                message: '알 수 없는 에러가 발생하였습니다.',
            };
            // update api history
            req.data.apiHistory.update({
                response_data: error.message,
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }
    }
);


/**
 * @swagger
 * paths:
 *   /api/containers:
 *     delete:
 *       tags:
 *         - Containers
 *       summary: 'Containers 자원 할당 해제'
 *       description:
 *         'Containers 자원 할당 해제 API 동작 설명 <br>
 *         <ul>
 *             <li>API 호출 이력 DB 저장</li>
 *             <li>Container 리소스 할당 데이터 삭제</li>
 *             <li>해당 Coordinator 정보 중, 사용 가능한 Container 갯수를 하나 증가</li>
 *             <li>API 호출 이력 결과 DB 업데이트</li>
 *         </ul>'
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coordinator_uuid:
 *                   type: string
 *                   description: 'WRS Server를 구분하는 값'
 *                 container_uuid:
 *                   type: string
 *                   description: '자원이 할당된 Web Container의 구분 값'
 *                 client_uuid:
 *                   type: string
 *                   description: 'Web Container와 매칭되는 Client 구분 값'
 *       responses:
 *         '200':
 *           description: 'CREATED'
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     description: '성공: success, 실패: fail'
 *                   message:
 *                     type: string
 *                     description: '에러발생이 그에 상응하는 메시지 전달'
 *
 */
router.delete(
    '/',
    reqLimit.apiLimiter,
    async function(req, res, next) {
        // add api_history
        const insertApiHistoryParams = {
            user_os: req.useragent.os,
            user_platform: req.useragent.platform,
            user_browser: req.useragent.browser,
            user_version: req.useragent.version,
            method: 'DELETE',
            request_headers: JSON.stringify(req.headers),
            api_url: req.originalUrl,
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);
        if (!req.data) {
            req.data = {};
        }
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // Valdiation
        const validateResult = containersValidator.releaseContainerResource(req.body);
        if (validateResult.error) {
            const err = {
                reqID: rTracer.id(),
                errUrl: req.originalUrl,
                message: validateResult.error.message,
                code: 'fail',
                queryParams: req.query,
                bodyParams: req.body,
            };
            // logger.error(JSON.stringify(err));

            const resData = {
                code: 'fail',
                message: validateResult.error.message,
            };
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }

        next();
    },
    async function(req, res, next) {
        // Data Validation
        const container = await models.tb_containers.findOne({
            where: {
                uuid: req.body.container_uuid,
                fk_coordinator_uuid: req.body.coordinator_uuid,
                fk_client_uuid: req.body.client_uuid,
                released_yn: false
            }
        });
        if (!container) {
            const err = {
                code: 'fail',
                message: '해당 자원의 할당 정보가 존재하지 않습니다.'
            };
            // api 이력 업데이트
            req.data.apiHistory.update({
                response_data: JSON.stringify(err),
                updated_at: dayjs().format()
            });

            // return
            return res.status(200).send(err);
        }

        const coordinator = await models.tb_coordinators.findOne({
            where: {
                uuid: req.body.coordinator_uuid,
                // deleted_yn: false
            }
        });
        if (!coordinator) {
            const err = {
                code: 'fail',
                message: '해당 자원의 Coordinator 정보가 존재하지 않습니다.'
            };
            // api 이력 업데이트
            req.data.apiHistory.update({
                response_data: JSON.stringify(err),
                updated_at: dayjs().format()
            });

            // return
            return res.status(200).send(err);
        }

        if (!req.data) {
            req.data = {};
        }
        req.data.coordinator = coordinator;
        req.data.container = container;

        next();
    },
    // jgkim
    function(req, res) {
        try {
            // tb_containers의 release 정보 업데이트
            req.data.container.update({
                released_yn: true,
                released_at: dayjs().format()
            });

            // tb_coordinator 의 available_containers 하나 더하기
            req.data.coordinator.update({
                available_containers: req.data.coordinator.available_containers + 1,
            });

            const resData = {
                code: 'success',
                message: '',
            }
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        } catch (error) {
            const resData = {
                code: 'fail',
                message: '알 수 없는 에러가 발생하였습니다.',
            };
            // update api history
            req.data.apiHistory.update({
                response_data: error.message,
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }
    }
);

module.exports = router;
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
const verifyUuid = require(`${rootPath}/middlewares/verify_auth_token`);
const ResData = require(`${rootPath}/middlewares/ResData`);

// libs
const useragent = require('express-useragent');
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
const coordinatorValidator = require(`${rootPath}/validations/coordinators`);


/**
 * @swagger
 * paths:
 *   /api/coordinators/register:
 *     post:
 *       tags:
 *         - Coordinators
 *       summary: 'Coordinator 정보 사전 등록'
 *       description:
 *         '<p>API 동작 내용 <br>
 *             배열로 입력받은 접속 도메인 정보를 저장.<br>
 *             이미 등록된 도메인 정보일 경우, 처리된 것으로 간주하며,
 *             등록되지 않은 도메인 정보를 테이블에 저장 처리.<br>
 *             response 로 처리 성공한 갯수와, 에러가 발생하여 처리되지 않은 데이터를 return</p>
 *         <p>Coordinator 정보 등록 Request Body 설명 <br>
 *             <strong>address: </strong> WRS Server 의 외부아이피(public ip) 정보<br>
 *             <strong>domain: </strong> WRS Server 의 접속 도메인 정보 <br>
 *             <strong>port_number: </strong> WRS Server 의 접속 포트 정보</p>'
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     required: true
 *                     description: 'WRS Server 자신의 외부아이피(public ip)의 주소'
 *                   domain:
 *                     type: string
 *                     required: true
 *                     description: 'WRS Server 의 접속 도메인 정보'
 *                   port_number:
 *                     type: integer
 *                     required: true
 *                     description: 'WRS Server 의 접속 포트 정보'
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
 *                   uuids:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         uuid:
 *                           type: string
 *                           description: 등록된 Coordinator의 uuid
 *                         address:
 *                           type: string
 *                           description: 등록된 Coordinator의 ip주소
 *                         domain:
 *                           type: string
 *                           description: 등록된 Coordinator의 domain
 *                         port_number:
 *                           type: integer
 *                           description: 등록된 Coordinator의 port_number
 *
 */
router.post(
    '/register',
    reqLimit.apiLimiter,
    async function(req, res, next) {
        // add api_history
        const insertApiHistoryParams = {
            user_os: req.useragent.os,
            user_platform: req.useragent.platform,
            user_browser: req.useragent.browser,
            user_version: req.useragent.version,
            method: 'POST',
            api_url: req.originalUrl,
            request_headers: JSON.stringify(req.headers),
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);

        if (!req.data)
            req.data = {};
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // validation
        const validateResult = coordinatorValidator.registerCoordinators(req.body);
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
    async function(req, res) {
        try {
            // 존재하는 데이터를 업데이트 한다
            let successCnt = 0;
            let failCnt = 0;
            let failData = [];
            try {
                for (const body of req.body) {

                    // 중복 데이터 찾기
                    const existData = await models.tb_coordinators.findOne({
                        where: {
                            ip: body.address,
                            domain: body.domain,
                            port_num: body.port_number
                        }
                    });

                    if (existData) {
                        // 동일한 데이터가 있으면 카운트만 올리고 skip
                        successCnt = successCnt + 1;
                    } else {
                        // 동일한 데이터가 없으면 저장
                        const coordinator = await models.tb_coordinators.create({
                            ip: body.address,
                            domain: body.domain,
                            port_num: body.port_number,
                            available_containers: 0,
                            deleted_yn: false,
                            deleted_at: null,
                            last_alive_at: null,
                        });

                        successCnt = successCnt + 1;
                    }
                }
            } catch (error) {
                failCnt = failCnt + 1;
                failData.push({
                    address: body.address,
                    domain: body.domain,
                    port_number: body.port_number,
                });
            }

            const resData = {
                code: 'success',
                message: '',
                successCount: successCnt,
                failCount: failCnt,
                failData: failData
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
 *   /api/coordinators:
 *     post:
 *       tags:
 *         - Coordinators
 *       summary: 'Coordinator 정보 등록'
 *       description:
 *         'Coordinator 정보 등록 Request Body 설명 <br>
 *         <strong>address: </strong> WRS Server 자신의 외부아이피(public ip)의 주소 <br>
 *         <strong>available_container: </strong> WRS Server에서 최대 구동가능한 웹 컨테이너의 개수 <br>
 *         <strong>port_number: </strong> Client가 접속할 웹 소켓의 포트 번호'
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   description: 'WRS Server 자신의 외부아이피(public ip)의 주소'
 *                 available_container:
 *                   type: integer
 *                   description: 'WRS Server에서 최대 구동가능한 웹 컨테이너의 개수'
 *                 port_number:
 *                   type: integer
 *                   description: 'Client가 접속할 웹 소켓의 포트 번호'
 *               required:
 *                 - address
 *                 - available_container
 *                 - port_number
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
 *                     deprecated: true
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
            api_url: req.originalUrl,
            request_headers: JSON.stringify(req.headers),
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);

        if (!req.data)
            req.data = {};
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // validation
        const validateResult = coordinatorValidator.postCoordinators(req.body);
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

        // 중복 데이터 찾기
        const existData = await models.tb_coordinators.findOne({
            where: {
                ip: req.body.address,
                port_num: req.body.port_number
            }
        });
        if (!existData) {
            const resData = {
                code: 'fail',
                message: 'address의 데이터가 존재하지 않습니다.',
            };
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }

        if (!req.data) {
            req.data = {};
        }
        req.data.coordinator = existData;

        next();
    },
    async function(req, res) {
        try {
            // 존재하는 데이터를 업데이트 한다
            const coordinator = await req.data.coordinator.update({
                available_containers: req.body.available_container,
                deleted_yn: false,
                deleted_at: null,
                last_alive_at: null,
            });
            const resData = {
                code: 'success',
                message: '',
                uuid: coordinator.uuid,
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
 *   /api/coordinators:
 *     put:
 *       tags:
 *         - Coordinators
 *       summary: 'Coordinator Keep Alive 보고'
 *       description:
 *         'Coordinator Keep Alive 상태 보고 API 동작 설명 <br>
 *         <ul>
 *             <li>WRS Server 는 주기적으로 현재 상태에 대한 정보를 3초마다 보고</li>
 *             <li>보고 받은 내용으로 Coordinator 및 Container 정보를 업데이트 (마지막 보고시간 DB 저장)</li>
 *             <li>10초간 보고가 없을 경우, 해당 Coordinator 의 삭제 처리 및 Container 의 모든 리소스 해제</li>
 *         </ul>
 *         <strong>uuid: </strong> WRS Server 등록시 발급받은 UUID <br>
 *         <strong>available_container: </strong> WRS Server에서 현재 구동가능한 웹 컨테이너의 개수'
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uuid:
 *                   type: string
 *                   description: Coordinator의 UUID
 *                 available_container_count:
 *                   type: integer
 *                   description: '가용 Container의 수'
 *               required:
 *                 - uuid
 *                 - allocated_containers
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
router.put(
    '/',
    reqLimit.apiLimiter,
    async function(req, res, next) {
        // add api_history
        const insertApiHistoryParams = {
            user_os: req.useragent.os,
            user_platform: req.useragent.platform,
            user_browser: req.useragent.browser,
            user_version: req.useragent.version,
            method: 'PUT',
            api_url: req.originalUrl,
            request_headers: JSON.stringify(req.headers),
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);

        if (!req.data)
            req.data = {};
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // validation
        const validateResult = coordinatorValidator.keepAliveCoordinators(req.body);
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

        // uuid 데이터 찾기
        const existData = await models.tb_coordinators.findOne({
            where: {
                uuid: req.body.uuid,
            }
        });
        if (!existData) {
            const resData = {
                code: 'fail',
                message: 'UUID와 일치하는 데이터가 존재하지 않습니다.',
            };
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }

        if (!req.data) {
            req.data = {};
        }
        req.data.coordinator = existData;

        next();
    },
    // jgkim
    async function(req, res) {
        try {
            // update deleted_yn
            await req.data.coordinator.update({
                available_containers: req.body.available_container_count,
                last_alive_at: dayjs().format(),
            });

            // 10초 넘은 데이터 찾기
            const timeoverDatas = await models.tb_coordinators.findAll({
                where: {
                    last_alive_at: {
                        [Op.lte]: dayjs().add(-10, 'second').format()
                    },
                    deleted_yn: false
                }
            });
            if (timeoverDatas && timeoverDatas.length > 0) {
                for (const timeoverData of timeoverDatas) {
                    // 삭제 처리
                    await timeoverData.update({
                        deleted_yn: true,
                        deleted_at: dayjs().format()
                    });
                    // tb_containers release 처리
                    await models.tb_containers.update({
                        released_yn: true,
                        released_at: dayjs().format()
                    }, {
                        where: {
                            fk_coordinator_uuid: timeoverData.uuid,
                            released_yn: false
                        }
                    });
                }
            }

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
                response_data: error.message
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }
    }
);


/**
 * @swagger
 * paths:
 *   /api/coordinators:
 *     delete:
 *       tags:
 *         - Coordinators
 *       summary: 'Coordinator 정보 삭제'
 *       description:
 *         'Coordinator 정보 삭제 설명 <br>
 *         호출한 IP의 정보 (Coordinator의 IP정보) 를 기반으로 한 Coordinator 정보 삭제'
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uuid:
 *                   type: string
 *                   description: 'WRS Server 의 UUID'
 *               required:
 *                 - uuid
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
            api_url: req.originalUrl,
            request_headers: JSON.stringify(req.headers),
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);

        if (!req.data)
            req.data = {};
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // validation
        const validateResult = coordinatorValidator.deleteCoordinators(req.body);
        if (validateResult.error) {
            const err = {
                reqID: rTracer.id(),
                errUrl: req.originalUrl,
                message: validateResult.error.message,
                code: 'fail',
                queryParams: req.query,
                bodyParams: req.body,
            };
            logger.error(JSON.stringify(err));

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

        // 중복 데이터 찾기
        const existData = await models.tb_coordinators.findOne({
            where: {
                uuid: req.body.uuid
            }
        });
        if (!existData) {
            const resData = {
                code: 'fail',
                message: 'UUID와 일치하는 데이터가 존재하지 않습니다.',
            };
            // update api history
            req.data.apiHistory.update({
                response_data: JSON.stringify(resData),
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }

        if (!req.data) {
            req.data = {};
        }
        req.data.coordinator = existData;

        next();
    },
    async function(req, res) {
        try {
            // update container release
            await models.tb_containers.update({
                released_yn: true,
                released_at: dayjs().format()
            }, {
                where: {
                    fk_coordinator_uuid: req.data.coordinator.uuid,
                    released_yn: false,
                }
            });

            // update deleted_yn
            await req.data.coordinator.update({
                deleted_yn: true,
                deleted_at: dayjs().format()
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
 *   /api/coordinators/resources:
 *     get:
 *       tags:
 *         - Coordinators
 *       summary: 'Coordinator 자원 검색'
 *       description:
 *         'Coordinator 자원 검색 설명'
 *       parameters:
 *         - in: header
 *           name: uuid
 *           schema:
 *             type: string
 *             #format: uuid
 *           required: true
 *           description: client의 uuid
 *         - in: query
 *           name: video_width
 *           schema:
 *             type: integer
 *           description: 영상 자원의 가로 사이즈
 *         - in: query
 *           name: video_height
 *           schema:
 *             type: integer
 *           description: 영상 자원의 세로 사이즈
 *       responses:
 *         '200':
 *           description: 'OK'
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
 *                   resources:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         uuid:
 *                           type: string
 *                           description: Coordinator의 uuid
 *                         address:
 *                           type: string
 *                           description: Coordinator의 접속 IP주소
 *                         port_number:
 *                           type: integer
 *                           description: Coordinator의 접속 Post
 *                         available_count:
 *                           type: integer
 *                           description: Coordinator의 접속 가능 리소스 수
 *
 *
 */
router.get(
    '/resources',
    // reqLimit.apiLimiter,
    async function(req, res, next) {
        // add api_history
        const insertApiHistoryParams = {
            user_os: req.useragent.os,
            user_platform: req.useragent.platform,
            user_browser: req.useragent.browser,
            user_version: req.useragent.version,
            method: 'GET',
            api_url: req.originalUrl,
            request_headers: JSON.stringify(req.headers),
            body_params: JSON.stringify(req.body),
        };
        const apiHistory = await models.tb_api_histories.create(insertApiHistoryParams);

        if (!req.data)
            req.data = {};
        req.data.apiHistory = apiHistory;

        next();
    },
    async function(req, res, next) {
        // validation client-uuid
        const cientUuidInfo = req.headers.uuid;
        if (!cientUuidInfo) {
            const resData = {
                code: 'fail',
                message: 'Request Header의 Client UUID가 누락 되었습니다.'
            };
            // update api history
            req.data.apiHistory.update({
                response_data: error.message,
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(200).send(resData);
        }
        next();
    },
    async function(req, res) {
        try {
            // find resources
            const coordinators = await models.tb_coordinators.findAll({
                attributes: [
                    'uuid',
                    'domain',
                    'port_num',
                    'available_containers',
                ],
                where: {
                    available_containers: {
                        [Op.gt]: 0
                    },
                    deleted_yn: false,
                },
                order: [
                    ['available_containers', 'DESC'],
                    ['last_alive_at', 'DESC'],
                ],
                offset: 0,
                limit: 20
            });

            const resData = {
                code: 'success',
                message: '',
                data: coordinators
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
            }
            // update api history
            req.data.apiHistory.update({
                response_data: error.message,
                updated_at: dayjs().format()
            });
            // logger.info(`updateHistory: ${JSON.stringify(updatedHistory)}`);

            return res.status(500).send(resData);
        }
    }
);


module.exports = router;

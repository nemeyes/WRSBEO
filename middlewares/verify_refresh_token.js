const rootPath = require('app-root-path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require(`${rootPath}/models`);
const models = db.models;

const jwt = require(`${rootPath}/utils/jwt`);
const config = require(`${rootPath}/envs/.${process.env.NODE_ENV || 'development'}`);

const createError = require("http-errors");

module.exports = async function (req, res, next) {
    // get token from request header
    const token_storage_name = config['jwt']['auth_token']['token_storage_name'];
    const token = req.header(token_storage_name) || req.cookies[`${token_storage_name}`];

    // not token, error...
    if (!token) return res.status(401).send('Access Denied...');

    try {
        const verified = jwt.refresh_verify(token);
        if (!verified.ok) {
            return next(createError(401, 'Refresh Token is Not Current...'));
        }

        // token의 DB검증이 아닌, token자체가 유효하다면 token의 user_seq로 검증
        const userByTokenSeq = await models.Users.findOne(
            {
                where: {
                    seq: verified.seq,
                    status: {[Op.in]: ['ACTIVE', 'STANDBY']}}
            }
        );
        if (!userByTokenSeq) {
            return res.status(401).send('Not Current Token...');
        }
        // req.user = userByTokenSeq;
        // req.verified_token = verified;
        next();
    } catch (error) {
        console.log(error);
        res.status(400).send('Invalid Token...');
    }
};

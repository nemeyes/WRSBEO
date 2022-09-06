const Joi = require('joi');

/**
 * Coordinator 사전 등록 파라미터 validation
 * @param data
 * @returns {Joi.ValidationResult<any>}
 */
module.exports.registerCoordinators = data => {
    const schema = Joi.array().items({
        address: Joi.string().min(7).max(30).ip().required().error((errors) => new Error('파라미터 address 값이 올바르지 않습니다.')),
        domain: Joi.string().max(300).required().error((errors) => new Error('파라미터 domain 값이 올바르지 않습니다.')),
        port_number: Joi.number().min(0).required().error((errors) => new Error('파라미터 port_number 값이 올바르지 않습니다.')),
    });
    return schema.validate(data);
};

/**
 * Coordinator 등록 파라미터 validation
 * @param data
 * @returns {Joi.ValidationResult<any>}
 */
module.exports.postCoordinators = data => {
    const schema = Joi.object({
        address: Joi.string().min(7).max(30).ip().required().error((errors) => new Error('파라미터 address 값이 올바르지 않습니다.')),
        available_container: Joi.number().min(0).required().error((errors) => new Error('파라미터 available_container 값이 올바르지 않습니다.')),
        port_number: Joi.number().min(0).required().error((errors) => new Error('파라미터 port_number 값이 올바르지 않습니다.')),
    });
    return schema.validate(data);
};

/**
 * Coordinator KeepAlive 파라미터 validation
 * @param data
 * @returns {Joi.ValidationResult<any>}
 */
module.exports.keepAliveCoordinators = data => {
    const schema = Joi.object({
        uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 uuid 값이 올바르지 않습니다.')),
        available_container_count: Joi.number().min(0).required().error((errors) => new Error('파라미터 available_container_count 값이 올바르지 않습니다.')),
    });
    return schema.validate(data);
};

/**
 * Coordinator 삭제 파라미터 validation
 * @param data
 * @returns {Joi.ValidationResult<any>}
 */
module.exports.deleteCoordinators = data => {
    const schema = Joi.object({
        uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 uuid 값이 올바르지 않습니다.')),
    });
    return schema.validate(data);
};


const Joi = require('joi');

/**
 * Containers 리소스 할당 등록 파라미터 validation
 * @param data
 * @returns {Joi.ValidationResult<any>}
 */
module.exports.allocatedContainerResource = data => {
    const schema = Joi.object({
        coordinator_uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 coordinator_uuid 값이 올바르지 않습니다.')),
        container_uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 container_uuid 값이 올바르지 않습니다.')),
        client_uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 client_uuid 값이 올바르지 않습니다.')),
        container_port_number : Joi.number().min(0).required().error((errors) => new Error('파라미터 container_port_number 값이 올바르지 않습니다.')),
        video_codec: Joi.string().max(30).required().error((errors) => new Error('파라미터 video_codec 값이 올바르지 않습니다.')),
        audio_codec : Joi.string().max(30).required().error((errors) => new Error('파라미터 audio_codec 값이 올바르지 않습니다.')),
        video_width : Joi.number().min(0).required().error((errors) => new Error('파라미터 video_width 값이 올바르지 않습니다.')),
        video_height : Joi.number().min(0).required().error((errors) => new Error('파라미터 video_height 값이 올바르지 않습니다.')),
    });
    return schema.validate(data);
};

/**
 * Client의 접속 해제로 인한 container resource release
 * @param data
 * @returns {Joi.ValidationResult<any>}
 */
module.exports.releaseContainerResource = data => {
    const schema = Joi.object({
        coordinator_uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 coordinator_uuid 값이 올바르지 않습니다.')),
        container_uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 container_uuid 값이 올바르지 않습니다.')),
        client_uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 client_uuid 값이 올바르지 않습니다.')),
    });
    return schema.validate(data);
};

// /**
//  * Coordinator 삭제 파라미터 validation
//  * @param data
//  * @returns {Joi.ValidationResult<any>}
//  */
// module.exports.deleteCoordinators = data => {
//     const schema = Joi.object({
//         uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 uuid 값이 올바르지 않습니다.')),
//     });
//     return schema.validate(data);
// };
//
// /**
//  * Coordinator 의 현재 상태 보고
//  * @param data
//  * @returns {Joi.ValidationResult<any>}
//  */
// module.exports.putCoordinators = data => {
//     const schema = Joi.object({
//         uuid: Joi.string().max(300).required().error((errors) => new Error('파라미터 uuid 값이 올바르지 않습니다.')),
//         available_container: Joi.number().min(0).required().error((errors) => new Error('파라미터 available_container 값이 올바르지 않습니다.')),
//     });
//     return schema.validate(data);
// };

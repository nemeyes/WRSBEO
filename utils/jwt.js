const rootPath = require("app-root-path");
const jwt = require("jsonwebtoken");
const config = require(`${rootPath}/envs/.${process.env.NODE_ENV || "development"}`);

module.exports = {
  sign: (coordinator) => {
    // uuid token 발급
    const payload = {
      ip: coordinator.ip,
      port: coordinator.port_num
    };

    return jwt.sign(payload, config["jwt"]["auth_token"]["token_secret"], {
      algorithm: config["jwt"]["auth_token"]["algorithm"],
      expiresIn: config["jwt"]["auth_token"]["expires_in"],
    });
  },
  verify: (token) => {
    // uuid token 검증
    try {
      const decoded = jwt.verify(
        token,
        config["jwt"]["auth_token"]["token_secret"]
      );
      return {
        ok: true,
        ip: decoded.ip,
        port_num: decoded.port_num,
        token: token,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      return {
        ok: false,
        token: token,
        message: error.message,
      };
    }
  },
  // refresh: (user) => {
  //   // refresh token 발급
  //   return jwt.sign(
  //     { seq: user.seq },
  //     config["jwt"]["refresh_token"]["token_secret"],
  //     {
  //       algorithm: config["jwt"]["refresh_token"]["algorithm"],
  //       expiresIn: config["jwt"]["refresh_token"]["expires_in"],
  //     }
  //   );
  // },
  // refresh_verify: (refresh_token) => {
  //   // refresh token 검증
  //   // redis 사용시 참고 (https://velog.io/@kshired/Express%EC%97%90%EC%84%9C-JWT%EB%A1%9C-%EC%9D%B8%EC%A6%9D%EC%8B%9C%EC%8A%A4%ED%85%9C-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0-Access-Token%EA%B3%BC-Refresh-Token)
  //   try {
  //     const decoded = jwt.verify(
  //       refresh_token,
  //       config["jwt"]["refresh_token"]["token_secret"]
  //     );
  //     return {
  //       ok: true,
  //       seq: decoded.seq,
  //     };
  //   } catch (error) {
  //     return {
  //       ok: false,
  //       message: error.message,
  //     };
  //   }
  // },
};

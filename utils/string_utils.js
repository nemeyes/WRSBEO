const crypto = require("crypto");

module.exports = {
  stringifyJSON(obj) {
    if (typeof obj === "object") {
      if (obj === null) {
        // typeof null을 해보면 'object'가 나오기 때문에 'object'안에서 처리해주었다.
        return "null";
      }
      if (Array.isArray(obj)) {
        //[value, value, value] 배열은 결국 요소(value)가 반복되기 때문에 저 부분을 재귀함수 처리해주면 된다.
        let result = ""; // 빈 문자열을 만들고
        for (let i = 0; i < obj.length; i++) {
          // 반복문으로
          result = result + stringifyJSON(obj[i]) + ","; // result에 계속 더해준다.
        }
        return "[" + result.slice(0, -1) + "]"; // slice를 해주는 이유는 마지막의 , 를 지우기 위해서
      } else {
        // object 일 경우 배열과 마찬가지로 해주는데, 객체는 결국 key와 value가 반복된다. {key : value, key : value, key: value}
        let result = "";
        for (key in obj) {
          if (typeof obj[key] === "function" || obj[key] === undefined)
            continue; // 이 부분은 JSON.stringify 특성상 함수와 undefined는 아무것도 표시하지 않기 때문에 그 처리를 해준 것이다.
          result = result + `stringfyJSON(key):{stringifyJSON(obj[key])},`;
        }
        return "{" + result.slice(0, -1) + "}";
      }
    }
  },

  /**
   * 유저 비밀번호 랜덤 생성
   * @param len
   */
  generateUserPassword(len) {
    len = len ? len : 8;
    const genPassword = new Date().getTime().toString(36);
    if (this.isEmpty(len)) {
      return genPassword;
    } else {
      return genPassword.substr(0, len);
    }
  },
  generateUserCode() {
    return crypto.randomBytes(15).toString("hex");
  },
  isEmpty(src) {
    if (typeof src == "undefined" || src == null || src == "") {
      return true;
    } else {
      return false;
    }
  },
  isNotEmpty(src) {
    if (typeof src !== "undefined" && src !== null && src !== "") {
      return true;
    } else {
      return false;
    }
  },
};

String.prototype.format = function () {
  let formatted = this;
  let i = 0;
  while (/%s/.test(formatted))
    formatted = formatted.replace("%s", arguments[i++]);
  return formatted;
};

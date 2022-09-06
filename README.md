# WRS Backoffice API

본 프로젝트는 WRS Backoffice API 의 프로젝트로서  
가상서버와 Web Client의 중간의 위치에서 서비스를 원활하게 사용 할 수 있도록 하는 Restful API 이다.

## 실행방법
pm2를 사용하여 프로젝트를 실행 할 수 있다.  
package.json 파일에 dev, start, stop 으로 구성되어 있으며, dev 와 start의 차이점은 env (dev, prod) 의 차이이며,  
이는 envs폴더 하위의 파일명과 일치한다.

## 소스 다운로드 부터 실행까지
1. git clone 으로 git repository 를 로컬에 저장
2. npm install 로 package.json 에 정의한 모든 library를 다운로드
3. 개발 환경에서 실행시, npm run dev
4. 운영 환경에서 실행시, npm start
5. pm2 로 실행한 서버를 중지 시킬 경우, npm stop
6. ecosystem.config.js 파일에 서버 설정에 대한 값이 저장되어 있으므로, 해당 값을 수정하여 pm2 를 실행 할 수 있음

## API 서버의 port 설정 및 swagger 설정
swagger의 기본 경로는 localhost:3030/api-docs 이며, 이는 config/swagger.js 파일에 정의 되어 있음.  
port의 정의는 bin/www 파일에 3030으로 정의 되어 있음.

## API 구성
* 가상서버 - API
  * 가상 서버의 등록
    * 가상 서버가 기동시 해당 서버의 정보를 등록 하도록 설계
    * 가상 서버가 자신의 domain 주소를 dynamic 하게 알 수 없으므로, 사전에 등록하는 방식으로 변경
  * 가상 서버의 health check
    * 가상 서버 자신의 정보 및 전체 리소스 가용 수, 할당 된 리소스 수, 할당 가능한 리로스 수를 3초마다 보고
    * health check 보고가 9초가 지난 가상서버는 불완전하게 다운되었다 판단하여 종료 처리 
  * 가상 서버의 리소스 할당 보고
    * 해당 가상 서버에 web client가 접속하면 API서버에 리소스 할당 보고를 하게 되며, API는 해당 서버의 할당 가능수를 -1 함.
  * 가상 서버의 리소스 release 보고
    * 해당 가상 서버에 web client가 접속을 해제하면 API서버에 리소스 release 보고를 하게 되며, API는 해당 서버의 할당 가능수를 +1 함.
  * 가상 서버의 종료 보고
    * 가상 서버의 시스템이 종료될 경우, API에 종료 보고를 하게 되며, API는 해당 서버의 종료 처리 후 client가 호출하는 접속 가능 목록에서 제외 됨.
* Web Client - API
  * 가상 서버 접속 가능 목록 요청
    * client가 어느 가상 서버에 접속을 해야할지 알 수 없으므로, API에 접속 가능 목록 요청을 하게되며, API는 할당 가능수의 내림차순으로 정렬하여 20개를 return 함.


## 运行demo
1.python版本: 3.5  
2.启动流程:  
```shell
cd gt4-python-demo
pip install -r requirements.txt
python3 start.py
```
3.在浏览器中访问<http://localhost:8077>即可看到demo界面  

## 接入流程
1.配置极验参数  
2.获取前端参数  
3.生成签名  
4.请求极验服务, 校验用户验证状态  
5.根据极验返回的用户验证状态, 网站主进行自己的业务逻辑

## 二次校验接口
|接口信息|说明|
|---|---|
|接口地址|<http://gcaptcha4.geetest.com/validate>|
|请求方式|GET/POST|
|内容类型|application/x-www-form-urlencoded|
|返回格式|json|

1.请求参数

|参数名|类型|说明|
|---|---|---|
|lot_number|string|验证流水号|
|captcha_output|string|验证输出信息|
|pass_token|string|验证通过标识|
|gen_time|string|验证通过时间戳|
|captcha_id|string|验证 id|
|sign_token|string|验证签名|

2.响应参数

|参数名|类型|说明|
|---|---|---|
|result|string|二次校验结果|
|reason|string|校验结果说明|
|captcha_args|dict|验证输出参数|

*en:*
## Run demo
1.python version: 3.5  
2.Start process:  
```shell
cd gt4-python-demo
pip install -r requirements.txt
python3 start.py
```
3.Visit http://localhost:8077 in browser to see demo interface  

## Access process
1.Configure GeeTest parameters  
2.Get front-end parameters  
3.Generate signature  
4.Request GeeTest service to validate user legitimacy  
5.Client follows its own business logic according to verification result returned from GeeTest server  

## Secondary validation interface
|Item|Description|
|---|---|
|API address|<http://gcaptcha4.geetest.com/validate>|
|Request method|GET/POST|
|Content type|application/x-www-form-urlencoded|
|Response format|json|

1.Request parameters

|Parameter Name|Type|Description|
|---|---|---|
|lot_number|string|Verify serial number|
|captcha_output|string|Verify output information|
|pass_token|string|Token of the verification|
|gen_time|string|Timestamp of the verification|
|captcha_id|string|CAPTCHA ID|
|sign_token|string|Verification signature|

2.Response parameters

|Parameter Name|Type|Description|
|---|---|---|
|result|string|Secondary validation result|
|reason|string|Validation result description|
|captcha_args|dict|Verify output parameters|
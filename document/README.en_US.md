
User Guide
===========

[中文](README.zh_CN.md) | English
This article mainly introduces the usage instructions of the talebook program and common issues. For manual installation or submitting PRs, please refer to the [Developer Guide](./Development.zh_CN.md).


Common Configuration Guide
===========
This article mainly introduces the usage instructions of the talebook program and common issues. For manual installation or submitting PRs, please refer to the [Developer Guide](./Development.zh_CN.md).

### Configure Kindle Push Function
Taking QQ Mail push as an example, go to [QQ Mail website](http://service.mail.qq.com/cgi-bin/help?subtype=1&amp;&amp;no=1001256&amp;&amp;id=28), apply for an SMTP account, and then configure it in the admin interface.

Please note that the username must include the email suffix (e.g., `@qq.com`), such as `demo@gmail.com`

### Configure User Login Function
This program supports user registration and social platform login functions. According to the instructions in the admin configuration interface, you can configure user capabilities that meet your needs.

Here we focus on the API account application addresses for common social platforms:
 - [Weibo Developer Website](http://open.weibo.com/developers)
 - [QQ Connect Login Website](https://connect.qq.com/)
 - [Github]() To be supplemented

### Logo (Applicable to v3.5.9 and later versions)

The favicon and QR code logo in the navigation menu are placed in the data directory ```/data/books/logo/```, which can be directly overwritten with new images.


### Logo (Applicable to v3.5.8 and older versions)

The favicon and QR code logo in the navigation menu are already built into the code directory ```/var/www/talebook/app/dist/img/```.
 - favicon.ico: Website icon file
 - link.png: QR code image

If you need to customize these two files, please directly overwrite them with new files.

If using docker to start, you need to mount these two directories when starting docker. For example:
```
docker run -d --name talebook -p 80:80 -v /data/calibre:/data -v /data/logo:/var/www/talebook/app/dist/img/ talebook/talebook
```

### Upload File Size
If you find that uploading large files fails, there may be two reasons:

1. If the program throws an exception (e.g., issue#61), it is because the tornado framework in this project has a default limit of 100M. Please go to the admin configuration to increase the corresponding configuration.

1. If it clearly prompts a `413` error code, it is generally because nginx limits the upload size. The nginx included in this project has been configured with `client_max_body_size 0`, which means no upload size limit;
Therefore, it is recommended that users check if there are other nginx proxy forwarding configured outside this project and adjust the configuration accordingly.

### How to configure Douban plugin?
You need to enable the [cxfksword/douban-api-rs](https://github.com/cxfksword/douban-api-rs) service, and then fill in the corresponding URL address (e.g., `http://10.0.0.1:8080`) into the advanced configuration item.

For those started with docker-compose (e.g., using the built-in `docker-compose.yml` configuration in this project), the URL address is: `http://douban-rs-api:80/`, because according to the docker-compose documentation, the service name can resolve to the corresponding IP address.

Common Issue Troubleshooting
===============
### supervisord startup failed

If you have adjusted the configuration in supervisord (e.g., port, directory), be sure to execute ```sudo supervisorctl reload all``` to re-read the configuration, otherwise it will not take effect and may cause startup failure.

If it prompts ```talebook:tornado-8000: ERROR(spawn error)```, it means the environment is not configured correctly.
Please open the log file ```/data/log/talebook.log``` to check the reason, focusing on the last Traceback error, paying attention to the error reason prompted by ```Traceback (most recent call last)```.

### The website can be opened, but it prompts ```500: internal server error```

In this case, it is generally an exception during service operation. Common reasons include incorrect directory permissions, database not created properly, or triggering a code bug.

**Generally it's because the data directory permissions are not set correctly, leading to startup exception**, you can check more about username, UID, directory permissions, etc.

Please open the log file ```/data/log/talebook.log``` to check the reason, focusing on the last Traceback error, paying attention to the error reason prompted by ```Traceback (most recent call last)```, and submit an issue to contact the developer for troubleshooting.

### Accessing the library in the "Moon+ Reader" APP fails, what should I do?

This is because the Moon+ Reader APP does not support cookies, causing login to fail. In the latest version of the system (v2.0.0-87-gf6d8f06), the program logic has been adjusted to allow normal browsing without login, only checking permissions when downloading. To avoid login prompts, please configure:
 - Turn off "Private Library" mode.
 - Turn on "Allow arbitrary downloads" (visitors don't need to register or login)

### The reader page is stuck and doesn't load the book, what should I do?

 This is because the browser's ad blocking plugin has blocked some JS, causing abnormal page loading. Please turn off related plugins and try again, such as uBlock Origin

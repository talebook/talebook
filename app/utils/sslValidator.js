import * as forge from 'node-forge';

/**
 * SSL 证书和私钥验证工具模块
 * 使用 node-forge 库进行专业的 SSL 证书解析和验证
 */

/**
 * 验证证书文件内容
 * @param {string} certContent - 证书文件内容 (PEM 格式)
 * @returns {Object} - 验证结果 { valid: boolean, error?: string, info?: Object }
 */
export function validateCertificate(certContent) {
  if (!certContent || typeof certContent !== 'string') {
    return { valid: false, error: '证书内容为空' };
  }

  try {
    // 清理证书内容，移除多余的空白字符
    const cleanedContent = certContent.trim();

    // 检查 PEM 格式头尾
    const certMatch = cleanedContent.match(
      /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/
    );
    if (!certMatch) {
      return { valid: false, error: '证书格式不正确，缺少有效的 PEM 头尾标记' };
    }

    // 使用 forge 解析证书
    const cert = forge.pki.certificateFromPem(cleanedContent);

    // 提取证书信息
    const info = {
      subject: cert.subject.getField('CN')?.value || 'Unknown',
      issuer: cert.issuer.getField('CN')?.value || 'Unknown',
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber,
      signatureAlgorithm: cert.siginfo.algorithmOid,
    };

    // 检查证书是否过期
    const now = new Date();
    if (now < cert.validity.notBefore) {
      return {
        valid: false,
        error: `证书尚未生效，生效时间: ${cert.validity.notBefore.toISOString()}`,
        info,
      };
    }
    if (now > cert.validity.notAfter) {
      return {
        valid: false,
        error: `证书已过期，过期时间: ${cert.validity.notAfter.toISOString()}`,
        info,
      };
    }

    return { valid: true, info };
  } catch (error) {
    return { valid: false, error: `证书解析失败: ${error.message}` };
  }
}

/**
 * 验证私钥文件内容
 * @param {string} keyContent - 私钥文件内容 (PEM 格式)
 * @returns {Object} - 验证结果 { valid: boolean, error?: string, info?: Object }
 */
export function validatePrivateKey(keyContent) {
  if (!keyContent || typeof keyContent !== 'string') {
    return { valid: false, error: '私钥内容为空' };
  }

  try {
    // 清理私钥内容
    const cleanedContent = keyContent.trim();

    // 检查 PEM 格式头尾 (支持多种私钥格式)
    const keyPatterns = [
      /-----BEGIN RSA PRIVATE KEY-----([\s\S]*?)-----END RSA PRIVATE KEY-----/,
      /-----BEGIN EC PRIVATE KEY-----([\s\S]*?)-----END EC PRIVATE KEY-----/,
      /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
      /-----BEGIN ENCRYPTED PRIVATE KEY-----([\s\S]*?)-----END ENCRYPTED PRIVATE KEY-----/,
    ];

    let keyMatch = null;
    let keyType = null;

    for (let i = 0; i < keyPatterns.length; i++) {
      keyMatch = cleanedContent.match(keyPatterns[i]);
      if (keyMatch) {
        keyType = ['RSA', 'EC', 'PKCS8', 'Encrypted PKCS8'][i];
        break;
      }
    }

    if (!keyMatch) {
      return { valid: false, error: '私钥格式不正确，缺少有效的 PEM 头尾标记' };
    }

    // 尝试解析私钥
    let privateKey;
    try {
      // 尝试 RSA 格式
      if (cleanedContent.includes('RSA PRIVATE KEY')) {
        privateKey = forge.pki.privateKeyFromPem(cleanedContent);
      }
      // 尝试 PKCS#8 格式
      else {
        privateKey = forge.pki.privateKeyFromPem(cleanedContent);
      }
    } catch (parseError) {
      // 如果是加密的私钥，我们只验证格式，不尝试解密
      if (cleanedContent.includes('ENCRYPTED PRIVATE KEY')) {
        return {
          valid: true,
          info: { type: keyType, encrypted: true },
        };
      }
      throw parseError;
    }

    // 提取私钥信息
    const info = {
      type: keyType,
      encrypted: false,
      algorithm: privateKey.n
        ? 'RSA'
        : privateKey.getPrivateKey
          ? 'EC'
          : 'Unknown',
    };

    // 如果是 RSA 密钥，获取密钥长度
    if (privateKey.n) {
      const keyLength = privateKey.n.toString(2).length;
      info.keyLength = Math.round(keyLength / 8) * 8; // 转换为字节长度并取整
    }

    return { valid: true, info };
  } catch (error) {
    return { valid: false, error: `私钥解析失败: ${error.message}` };
  }
}

/**
 * 验证证书和私钥是否匹配
 * @param {string} certContent - 证书内容
 * @param {string} keyContent - 私钥内容
 * @returns {Object} - 验证结果 { valid: boolean, error?: string }
 */
export function validateCertKeyMatch(certContent, keyContent) {
  const certResult = validateCertificate(certContent);
  if (!certResult.valid) {
    return { valid: false, error: `证书验证失败: ${certResult.error}` };
  }

  const keyResult = validatePrivateKey(keyContent);
  if (!keyResult.valid) {
    return { valid: false, error: `私钥验证失败: ${keyResult.error}` };
  }

  // 如果私钥是加密的，无法验证匹配性
  if (keyResult.info?.encrypted) {
    return {
      valid: true,
      warning: '私钥已加密，无法验证与证书的匹配性',
    };
  }

  try {
    const cert = forge.pki.certificateFromPem(certContent.trim());
    const privateKey = forge.pki.privateKeyFromPem(keyContent.trim());

    // 获取证书的公钥
    const certPublicKey = cert.publicKey;

    // 验证方法：使用私钥签名，然后用证书中的公钥验证
    // 或者比较公钥的模数（对于 RSA）
    if (certPublicKey.n && privateKey.n) {
      // RSA 密钥，比较模数
      if (certPublicKey.n.toString() !== privateKey.n.toString()) {
        return { valid: false, error: '证书与私钥不匹配（RSA 模数不一致）' };
      }
      if (certPublicKey.e.toString() !== privateKey.e.toString()) {
        return { valid: false, error: '证书与私钥不匹配（RSA 指数不一致）' };
      }
    } else {
      // 对于其他类型的密钥，使用签名验证方法
      const testData = 'test-data-for-key-matching';
      const md = forge.md.sha256.create();
      md.update(testData, 'utf8');

      try {
        const signature = privateKey.sign(md);
        const verified = certPublicKey.verify(md.digest().bytes(), signature);
        if (!verified) {
          return { valid: false, error: '证书与私钥不匹配（签名验证失败）' };
        }
      } catch (signError) {
        return {
          valid: false,
          error: `证书与私钥匹配验证失败: ${signError.message}`,
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `匹配验证失败: ${error.message}` };
  }
}

/**
 * 从 File 对象读取并验证证书
 * @param {File} certFile - 证书文件对象
 * @returns {Promise<Object>} - 验证结果
 */
export async function validateCertFile(certFile) {
  if (!certFile) {
    return { valid: false, error: '未选择证书文件' };
  }

  try {
    const content = await certFile.text();
    return validateCertificate(content);
  } catch (error) {
    return { valid: false, error: `读取证书文件失败: ${error.message}` };
  }
}

/**
 * 从 File 对象读取并验证私钥
 * @param {File} keyFile - 私钥文件对象
 * @returns {Promise<Object>} - 验证结果
 */
export async function validateKeyFile(keyFile) {
  if (!keyFile) {
    return { valid: false, error: '未选择私钥文件' };
  }

  try {
    const content = await keyFile.text();
    return validatePrivateKey(content);
  } catch (error) {
    return { valid: false, error: `读取私钥文件失败: ${error.message}` };
  }
}

/**
 * 验证证书和私钥文件是否匹配
 * @param {File} certFile - 证书文件对象
 * @param {File} keyFile - 私钥文件对象
 * @returns {Promise<Object>} - 验证结果
 */
export async function validateCertKeyFiles(certFile, keyFile) {
  if (!certFile) {
    return { valid: false, error: '未选择证书文件' };
  }
  if (!keyFile) {
    return { valid: false, error: '未选择私钥文件' };
  }

  try {
    const certContent = await certFile.text();
    const keyContent = await keyFile.text();
    return validateCertKeyMatch(certContent, keyContent);
  } catch (error) {
    return { valid: false, error: `读取文件失败: ${error.message}` };
  }
}

export default {
  validateCertificate,
  validatePrivateKey,
  validateCertKeyMatch,
  validateCertFile,
  validateKeyFile,
  validateCertKeyFiles,
};

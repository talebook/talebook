<template>
  <div class="opds-page">
    <h1>OPDS 介绍</h1>
    <section>
      <h2>OPDS 链接</h2>
      <p>您的 OPDS 链接为：<code>{{ opdsUrl }}</code></p>
    </section>
    <section>
      <h2>常见 OPDS 阅读软件</h2>
      <ul>
        <li><strong>KyBook</strong>：支持 iOS 和 macOS 的电子书阅读器 <a href="https://apps.apple.com/app/kybook/id1049898139" target="_blank" rel="noopener noreferrer">[下载]</a></li>
        <li><strong>静读天下</strong>：Android 平台上功能强大的电子书阅读器 <a href="https://play.google.com/store/apps/details?id=com.flyersoft.moonreader" target="_blank" rel="noopener noreferrer">[下载]</a></li>
      </ul>
    </section>
    <section>
      <h2>配置指南</h2>
      <ol>
        <li>在阅读器中添加新的 OPDS 书库</li>
        <li>输入您的 OPDS 链接</li>
        <li>根据提示完成认证（如果需要）</li>
        <li>开始浏览和阅读您的电子书</li>
      </ol>

      <h2>请注意</h2>
      <p>因为静读天下APP不支持cookie登录，因此需要做如下配置：</p>
      <ol>
          <li>关闭「私人图书馆」模式。</li>
          <li>打开「允许任意下载」（访客无需注册或登录）</li>
      </ol>
    </section>
  </div>
</template>

<script>
export default {
  data() {
    return {
      opdsUrl: window.location.origin + '/opds/'
    }
  }
}
</script>

<style scoped>
.opds-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

section {
  margin-bottom: 30px;
}

h2 {
  margin-bottom: 15px;
}

ul, ol {
  padding-left: 20px;
}

code {
  background: #f5f5f5;
  padding: 2px 5px;
  border-radius: 3px;
}
</style>

import os
import zipfile

os.makedirs('/tmp/src', exist_ok=True)
p = '/tmp/src/demo.epub'
with zipfile.ZipFile(p, 'w') as z:
    z.writestr('mimetype', 'application/epub+zip')
    z.writestr('META-INF/container.xml',
               '<?xml version="1.0"?><container version="1.0" '
               'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
               '<rootfiles><rootfile full-path="OEBPS/content.opf" '
               'media-type="application/oebps-package+xml"/></rootfiles></container>')
    z.writestr('OEBPS/content.opf',
               '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" '
               'xmlns:dc="http://purl.org/dc/elements/1.1/" version="3.0" unique-identifier="id">'
               '<metadata><dc:title>登录态验证书</dc:title><dc:creator>验证作者</dc:creator>'
               '<dc:language>zh-CN</dc:language><dc:identifier id="id">9787536692930</dc:identifier>'
               '<dc:publisher>验证出版社</dc:publisher></metadata>'
               '<manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest>'
               '<spine><itemref idref="c1"/></spine></package>')
    z.writestr('OEBPS/c1.xhtml',
               '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>'
               '<p>登录态验证正文。</p></body></html>')
print('epub written:', p)
from pathlib import Path
import base64,re
root=Path(__file__).parent
logic=(root/'src/logic.mjs').read_text().replace('export ','')
card=re.sub(r'^import .*?;\n','',(root/'src/card.js').read_text(),flags=re.M)
card=card.replace('__BACKPLATE__','data:image/webp;base64,'+base64.b64encode((root/'assets/titan-backplate.webp').read_bytes()).decode())
bundle='(()=>{\n'+logic+'\n'+card+'\n})();'
for name in ['titan-climate-card.js','titan-climate-card.js.txt']:(root/name).write_text(bundle)
demo=(root/'src/demo.html').read_text().replace('__CARD_JS__',bundle.replace('</script','<\\/script'))
for name in ['TITAN-Climate-Demo.html','index.html']:(root/name).write_text(demo)
print('TITAN built:',len(bundle.encode()),'bytes, all graphics embedded')

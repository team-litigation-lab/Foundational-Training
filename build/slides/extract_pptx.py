import zipfile, re, json, subprocess, sys
from xml.etree import ElementTree as ET
NS={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
A='{%s}'%NS['a']
def boxes(xml):
    root=ET.fromstring(xml); out=[]; seen=set()
    for sp in root.iter():
        if not (sp.tag.endswith('}sp') or sp.tag.endswith('}graphicFrame')): continue
        paras=[]
        for p in sp.iter(A+'p'):
            t=''.join(r.text or '' for r in p.iter(A+'t'))
            if t.strip(): paras.append(re.sub(r'\s+',' ',t).strip())
        if paras:
            k='|'.join(paras)
            if k not in seen: seen.add(k); out.append(paras)
    return out
def page(f):
    z=zipfile.ZipFile(f)
    pres=ET.fromstring(z.read('ppt/presentation.xml')); rels=ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
    rmap={r.get('Id'):r.get('Target') for r in rels}
    s='ppt/'+rmap[pres.find('p:sldIdLst',NS)[0].get('{%s}id'%NS['r'])]
    notes=''; paras=[]
    try:
        for x in ET.fromstring(z.read(s.replace('slides/','slides/_rels/')+'.rels')):
            if 'notesSlide' in x.get('Type'):
                nb=boxes(z.read('ppt/'+x.get('Target').replace('../','')))
                nt=[' '.join(p) for p in nb]
                nt=[t for t in nt if not re.fullmatch(r'\d+|‹#›|\d+\.\d+\.\d+',t.strip())]
                notes=' '.join(nt)
                paras=[p for b in nb for p in b if not re.fullmatch(r'\d+|‹#›|\d+\.\d+\.\d+|1\.7\.2013',p.strip())]
    except KeyError: pass
    notes=re.sub(r'^1\.7\.2013\s*','',notes).replace('‹#›','').strip()
    paras=[p.replace('‹#›','').strip() for p in paras if p.replace('‹#›','').strip()]
    return {'boxes':boxes(z.read(s)),'notes':notes,'paras':paras}
lst=subprocess.run(['python3',sys.argv[1]],capture_output=True,text=True).stdout.split('\n')
out=[]
for line in lst:
    if not line.strip(): continue
    k,f=line.split(' ',1)
    d=page(f); d['key']=k; out.append(d)
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
print(len(out),'pages')

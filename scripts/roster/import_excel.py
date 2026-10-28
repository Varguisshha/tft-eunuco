from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import argparse
import hashlib,json,unicodedata,re
root=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description='Read-only Excel matrix extraction, standard library only')
parser.add_argument('--source',type=Path,default=root/'TFPeru/Copia de TFPeru.xlsx')
parser.add_argument('--check',action='store_true')
args=parser.parse_args()
source=args.source
# All sheets and cells are decoded; formulas are deliberately rejected as assignments.
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def column_number(letters):
 n=0
 for char in letters:n=n*26+ord(char)-64
 return n
def coordinate(row,col):
 letters=''
 while col:col,d=divmod(col-1,26);letters=chr(65+d)+letters
 return letters+str(row)
class Sheet:
 def __init__(self,title,rows):self.title=title;self.values=rows
 def cell(self,row,col):
  class Cell:pass
  c=Cell();c.coordinate=coordinate(row,col);return c
with ZipFile(source) as archive:
 strings=[]
 if 'xl/sharedStrings.xml' in archive.namelist():
  strings=[''.join(t.text or '' for t in item.findall('.//m:t',NS)) for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si',NS)]
 relations={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
 w=[]
 for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS):
  target=relations[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
  target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  doc=ET.fromstring(archive.read(target));cells={};maxrow=maxcol=0
  maxrow=max((int(r.attrib['r']) for r in doc.findall('m:sheetData/m:row',NS)),default=0)
  for cell in doc.findall('.//m:sheetData/m:row/m:c',NS):
   ref=cell.attrib['r'];letters=''.join(c for c in ref if c.isalpha());row=int(''.join(c for c in ref if c.isdigit()));col=column_number(letters)
   maxrow=max(maxrow,row);maxcol=max(maxcol,col)
   if cell.find('m:f',NS) is not None:raise ValueError('Formula in source '+ref)
   value=cell.find('m:v',NS)
   raw=value.text if value is not None else None
   kind=cell.attrib.get('t')
   if kind=='s' and raw is not None:raw=strings[int(raw)]
   if kind=='inlineStr':raw=''.join(t.text or '' for t in cell.findall('.//m:t',NS))
   cells[row,col]=raw
  dimension=doc.find('m:dimension',NS)
  if dimension is not None:
   end=dimension.attrib['ref'].split(':')[-1]
   maxrow=max(maxrow,int(''.join(c for c in end if c.isdigit())));maxcol=max(maxcol,column_number(''.join(c for c in end if c.isalpha())))
  w.append(Sheet(sheet.attrib['name'],[tuple(cells.get((row,col)) for col in range(1,maxcol+1)) for row in range(1,maxrow+1)]))
slug=lambda s: re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()).strip('-')
trait_ids={'Ruman Trinity':'ruman_trinity','Perdidos por el mundo':'perdidos_por_el_mundo'}
sheets=[];characters=[];traits=[];unique=[];matrix=[];issues=[]
for s in w:
 rows=list(s.values);sheets.append({'name':s.title,'rows':len(rows),'columns':max(map(len,rows))})
 header=rows[0]; columns=[(i,name) for i,name in enumerate(header) if i and name is not None]
 for col,name in columns:
  cid='jaramillo' if name=='Erik' else slug(name)
  characters.append({'id':cid,'sourceName':name,'name':{'dolea':'DOLEA','vargas':'VARGAS','florin':'FLORIN','jaramillo':'JARAMILLO'}.get(cid,name),'headerCell':s.cell(1,col+1).coordinate,'synergies':[]})
 for ri,row in enumerate(rows[1:],2):
  label=row[0] if row else None
  if not label:continue
  if str(label).strip().casefold()=='atributos únicos':
   for j in range(ri,len(rows)):
    data=rows[j];
    if not data:continue
    name=data[0];owner=data[1] if len(data)>1 else None
    if name is None:continue
    if not owner:issues.append(f'missing unique owner at row {j+1}');continue
    cid=next((c['id'] for c in characters if c['sourceName']==owner),None)
    tid={'Depredador':'el-depredador','Mano de obra':'mano_de_obra'}.get(name,slug(name))
    unique.append({'id':tid,'name':{'el-depredador':'El Depredador','mano_de_obra':'Mano de Obra'}.get(tid,name),'sourceName':name,'ownerId':cid,'cell':s.cell(j+1,1).coordinate})
    next(c for c in characters if c['id']==cid)['synergies'].append(tid)
   break
  if str(label).strip().casefold()=='atributos':continue
  tid=trait_ids.get(label,slug(label));members=[];cells=[]
  for ci,(col,name) in enumerate(columns):
   raw=row[col] if col<len(row) else None
   val=str(raw).strip().casefold() if raw is not None else None
   if val not in ('si','sí','no'):issues.append(f'unexpected membership {s.cell(ri,col+1).coordinate}: {raw}')
   yes=val in ('si','sí');cid=characters[ci]['id'];cells.append({'cell':s.cell(ri,col+1).coordinate,'raw':raw,'member':yes,'characterId':cid})
   if yes:members.append(cid);characters[ci]['synergies'].append(tid)
  traits.append({'id':tid,'name':label,'cell':s.cell(ri,1).coordinate,'members':members})
  matrix.append({'traitId':tid,'cells':cells})
for values,label in [(characters,'characters'),(traits,'traits'),(unique,'unique')]:
 ids=[v['id'] for v in values]
 if len(ids)!=len(set(ids)):issues.append('Duplicate '+label+' ID')
assert not issues,issues
out={'version':'f0p10a-excel-1','source':{'originalPath':'/Users/vargas/Downloads/Copia de TFPeru.xlsx','copyPath':'TFPeru/Copia de TFPeru.xlsx','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sheets':sheets},'characters':characters,'collectives':traits,'uniques':unique,'matrix':matrix,'issues':issues}
destination=root/'packages/game-data/src/roster-excel-source.json'
if args.check:
 assert json.loads(destination.read_text())==out,'Manifest differs from workbook; regenerate and review source changes'
else:destination.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Counts',len(characters),len(traits),len(unique));print('Members',[(t['name'],len(t['members'])) for t in traits]);print('Affinities',[(c['sourceName'],len(c['synergies'])) for c in characters])

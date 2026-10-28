"""Extract only factual item parameters/recipes and official localized names, never art."""
from pathlib import Path
import json,hashlib,sys
base=Path(sys.argv[1] if len(sys.argv)>1 else 'artifacts/p11/audit')
raw=(base/'frozen-en.json').read_bytes()
namesraw=(base/'riot-es.json').read_bytes()
x=json.loads(raw);names=json.loads(namesraw)['data']
components=['TFT_Item_'+s for s in ['BFSword','RecurveBow','NeedlesslyLargeRod','TearOfTheGoddess','ChainVest','NegatronCloak','GiantsBelt','SparringGloves']]
records=[]
for i in x['items']:
 pair=i.get('composition',[])
 if i['apiName'] not in components and not(len(pair)==2 and all(c in components for c in pair) and not i['apiName'].startswith('TFT_Item_Corrupted')):continue
 records.append(dict(recordId=i['apiName'],nameEn=i['name'],nameEs=names[i['apiName']]['name'],components=pair,parameters=i['effects'],unique=i['unique'],incompatibleTraits=i['incompatibleTraits']))
assert len(records)==44
assert len({tuple(sorted(r['components'])) for r in records if r['components']})==36
overrides={
 'TFT_Item_Bloodthirster':{'HealthThreshold':50,'AD':0.18,'AP':18,'ShieldHealthPercent':30},
 'TFT_Item_GuardianAngel':{'HealthThreshold':40,'MissingHealthRestore':0.15},
 'TFT_Item_UnstableConcoction':{'AD_NotStatBar':0.18,'AP_NotStatBar':18,'StatOmnivamp_NotStatBar':0.12},
 'TFT_Item_Crownguard':{'ShieldBonusAP':20},
 'TFT_Item_Redemption':{'VerifiedDurability':0.10},
}
for r in records:
 r['baselineParameters']=dict(r['parameters'])
 r['parameters'].update(overrides.get(r['recordId'],{}))
 r['officialOverrides']=overrides.get(r['recordId'],{})
out=dict(version='tft-18.5-2026-10-27',patch='18.5 with 27 October update',sources=[dict(url='https://raw.communitydragon.org/16.21/cdragon/tft/en_us.json',sha256=hashlib.sha256(raw).hexdigest(),authority='Game client extraction; not official Riot hosted documentation'),dict(url='https://ddragon.leagueoflegends.com/cdn/16.21.1/data/es_ES/tft-item.json',sha256=hashlib.sha256(namesraw).hexdigest(),authority='Official Riot Data Dragon localized names'),dict(url='https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5/',authority='Official Riot patch notes; Hand of Justice omnivamp 12% on 27 October'),dict(url='https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-17-1/',authority='Official Precision definition'),dict(url='https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/roles-revamped-and-item-changes/',authority='Official roles and mana changes')],records=sorted(records,key=lambda r:r['recordId']))
mapraw=(base/'raw-map22.json').read_bytes()
mapdata=json.loads(mapraw)
set18=[]
for path,value in mapdata.items():
 if '/TFTSet18/Set18_Items/' not in path or value.get('__type')!='TftItemData':continue
 pair=[p.rsplit('/',1)[-1] for p in value.get('mComposition',[])]
 if len(pair)==2 and all(p.replace('DA_Component_','TFT_Item_') in components for p in pair):set18.append(dict(recordId=value['mName'],components=[p.replace('DA_Component_','TFT_Item_') for p in pair]))
assert len(set18)==36
for r in out['records']:
 if r['components']:
  matches=[v for v in set18 if sorted(v['components'])==sorted(r['components'])]
  assert len(matches)==1
  r['set18RecordId']=matches[0]['recordId']
 else:r['set18RecordId']=r['recordId'].replace('TFT_Item_','DA_Component_')
out['sources'].append(dict(url='https://raw.communitydragon.org/16.21/game/data/maps/shipping/map22/map22.bin.json',sha256=hashlib.sha256(mapraw).hexdigest(),authority='Set18 game client records: exact 36 recipes; their effect constants are omitted'))
out['sources'] += [dict(url=f'https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-{n}/',authority='Official standard item delta from the prior version') for n in [1,2,3,4]]
out['limitations'] = ['Legacy Hextech records are a baseline, not the new Unreal Set18 execution. Official deltas are explicit overlays.', 'DA Set18 records in the map file contain recipes but omit item effect constants. No claim of full runtime fidelity.']
Path('packages/game-data/src/reference/tft-18.5-items.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Extracted 8 components and 36 recipes; official images excluded.')

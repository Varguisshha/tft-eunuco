"""Extract numeric shop data only. No Riot artwork or client logic is copied."""
import hashlib,json,pathlib
source=pathlib.Path('artifacts/p11/audit/raw-map22.json')
data=json.loads(source.read_text())
set_path='Maps/Shipping/Map22/Sets/TFTSet18'
reference=data[set_path]['DropRateTables']['Shop']
rows=[{'level':i+1,'odds':[round(w*100) for w in r['{bcf1e6a6}']]} for i,r in enumerate(data[reference]['mDropRatesByLevel'][:10])]
assert all(sum(r['odds'])==100 and len(r['odds'])==5 for r in rows)
expected=[[100,0,0,0,0],[100,0,0,0,0],[75,25,0,0,0],[55,30,15,0,0],[45,33,20,2,0],[30,40,25,5,0],[19,30,40,10,1],[15,20,32,30,3],[10,17,25,33,15],[5,10,20,40,25]]
assert [r['odds'] for r in rows]==expected
result={'version':'tft-18.5-shop-2026-10-27','source':'https://raw.communitydragon.org/16.21/game/data/maps/shipping/map22/map22.bin.json','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'setPath':set_path,'reference':reference,'field':'mDropRatesByLevel/{bcf1e6a6}','officialReferences':['https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-16-1/','https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-17-1/','https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-5/'],'note':'Numeric Riot client data extracted via CommunityDragon; level 8/9 changes confirmed by 16.1 and level 7 by 17.1. 18.5 makes no shop-odds change. Level 11 source row excluded. Game level cap remains 7.','levels':rows}
pathlib.Path('packages/game-data/src/reference/tft-18.5-shop.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')

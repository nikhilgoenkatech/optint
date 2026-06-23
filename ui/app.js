import { queryExecutionClient } from '@dynatrace-sdk/client-query';

// ============================================================
// DATA
// ============================================================
const MOCK_PROBLEMS = [
  {id:'P-001',title:'Response time degradation on /api/checkout',biz:'Checkout Experience Degraded',status:'RESOLVED',sev:'PERFORMANCE',start:Date.now()-172800000,dur:60,users:3200,mz:['Production','E-Commerce'],tags:['team:checkout','tier:critical'],hasRCA:true,rca:'checkout-service',svcs:['ShopApp'],rec:80,impact:72,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-002',title:'Response time degradation on /api/checkout',biz:'Checkout Experience Degraded',status:'RESOLVED',sev:'PERFORMANCE',start:Date.now()-86400000,dur:50,users:2800,mz:['Production'],tags:['team:checkout','tier:critical'],hasRCA:true,rca:'checkout-service',svcs:['ShopApp'],rec:80,impact:68,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-003',title:'Response time degradation on /api/checkout',biz:'Checkout Experience Degraded',status:'OPEN',sev:'PERFORMANCE',start:Date.now()-7200000,dur:null,users:1900,mz:['Production'],tags:['team:checkout','tier:critical'],hasRCA:false,rca:null,svcs:['ShopApp'],rec:80,impact:65,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-004',title:'High failure rate on payment-gateway service',biz:'Payment Processing Failures',status:'RESOLVED',sev:'ERROR',start:Date.now()-259200000,dur:120,users:5600,mz:['Production'],tags:['team:payments','tier:critical'],hasRCA:true,rca:'payment-gateway',svcs:['ShopApp','MobileApp'],rec:80,impact:88,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-005',title:'High failure rate on payment-gateway service',biz:'Payment Processing Failures',status:'RESOLVED',sev:'ERROR',start:Date.now()-172800000,dur:90,users:4200,mz:['Production'],tags:['team:payments','tier:critical'],hasRCA:false,rca:null,svcs:['ShopApp'],rec:80,impact:80,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-006',title:'High failure rate on payment-gateway service',biz:'Payment Processing Failures',status:'RESOLVED',sev:'ERROR',start:Date.now()-43200000,dur:60,users:3100,mz:['Production'],tags:['team:payments','tier:critical'],hasRCA:true,rca:'payments-db',svcs:['ShopApp'],rec:80,impact:74,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-007',title:'CPU spike on inventory-service pod',biz:'Inventory System Performance Issue',status:'RESOLVED',sev:'RESOURCE_CONTENTION',start:Date.now()-345600000,dur:15,users:0,mz:['Production'],tags:['team:inventory'],hasRCA:false,rca:null,svcs:['inventory-service'],rec:100,impact:28,noise:true,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-008',title:'CPU spike on inventory-service pod',biz:'Inventory System Performance Issue',status:'RESOLVED',sev:'RESOURCE_CONTENTION',start:Date.now()-302400000,dur:15,users:0,mz:['Production'],tags:['team:inventory'],hasRCA:false,rca:null,svcs:['inventory-service'],rec:100,impact:28,noise:true,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-009',title:'CPU spike on inventory-service pod',biz:'Inventory System Performance Issue',status:'RESOLVED',sev:'RESOURCE_CONTENTION',start:Date.now()-216000000,dur:15,users:0,mz:['Production'],tags:['team:inventory'],hasRCA:false,rca:null,svcs:['inventory-service'],rec:100,impact:32,noise:true,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-010',title:'CPU spike on inventory-service pod',biz:'Inventory System Performance Issue',status:'OPEN',sev:'RESOURCE_CONTENTION',start:Date.now()-3600000,dur:null,users:0,mz:['Production'],tags:['team:inventory'],hasRCA:false,rca:null,svcs:['inventory-service'],rec:100,impact:32,noise:true,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-011',title:'Service unavailability: auth-service',biz:'Login & Authentication Outage',status:'RESOLVED',sev:'AVAILABILITY',start:Date.now()-432000000,dur:60,users:12000,mz:['Production','Critical'],tags:['team:auth','tier:critical'],hasRCA:true,rca:'auth-service',svcs:['ShopApp','AdminPortal'],rec:20,impact:95,noise:false,cloud:'aws',region:'us-east-1'},
  {id:'P-012',title:'Memory leak detected: recommendation-engine',biz:'Personalisation Engine Degraded',status:'RESOLVED',sev:'RESOURCE_CONTENTION',start:Date.now()-518400000,dur:240,users:800,mz:['Production'],tags:['team:ml'],hasRCA:true,rca:'recommendation-engine',svcs:['ShopApp'],rec:20,impact:55,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-013',title:'Slow database queries detected: product-catalog-db',biz:'Product Search Performance Impact',status:'RESOLVED',sev:'PERFORMANCE',start:Date.now()-604800000,dur:60,users:4500,mz:['Production'],tags:['team:catalog','tier:critical'],hasRCA:true,rca:'product-catalog-db',svcs:['ShopApp','MobileApp'],rec:40,impact:70,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-014',title:'Slow database queries detected: product-catalog-db',biz:'Product Search Performance Impact',status:'RESOLVED',sev:'PERFORMANCE',start:Date.now()-360000000,dur:60,users:3800,mz:['Production'],tags:['team:catalog','tier:critical'],hasRCA:true,rca:'product-catalog-db',svcs:['ShopApp'],rec:40,impact:66,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-015',title:'External API timeout: shipping-provider',biz:'Order Shipping Estimate Delays',status:'RESOLVED',sev:'ERROR',start:Date.now()-691200000,dur:60,users:2100,mz:['Production'],tags:['team:fulfillment'],hasRCA:false,rca:null,svcs:['ShopApp'],rec:20,impact:50,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-016',title:'High GC pause rate: search-indexer',biz:'Search & Discovery Performance Drop',status:'RESOLVED',sev:'PERFORMANCE',start:Date.now()-129600000,dur:60,users:7200,mz:['Production'],tags:['team:search'],hasRCA:true,rca:'search-indexer',svcs:['ShopApp','MobileApp'],rec:20,impact:78,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-017',title:'Network latency: cross-region replication',biz:'Regional Connectivity Issue',status:'OPEN',sev:'PERFORMANCE',start:Date.now()-1800000,dur:null,users:320,mz:['Production'],tags:['team:platform'],hasRCA:false,rca:null,svcs:['MobileApp'],rec:20,impact:42,noise:false,cloud:'aws',region:'us-east-1'},
  {id:'P-018',title:'Container OOMKilled: session-service',biz:'User Session Interruption',status:'RESOLVED',sev:'AVAILABILITY',start:Date.now()-388800000,dur:30,users:1500,mz:['Production'],tags:['team:auth'],hasRCA:false,rca:null,svcs:['ShopApp'],rec:40,impact:58,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-019',title:'Container OOMKilled: session-service',biz:'User Session Interruption',status:'RESOLVED',sev:'AVAILABILITY',start:Date.now()-259200000,dur:30,users:1200,mz:['Production'],tags:['team:auth'],hasRCA:false,rca:null,svcs:['ShopApp'],rec:40,impact:54,noise:false,cloud:'aws',region:'ap-southeast-2'},
  {id:'P-020',title:'Disk I/O saturation: log-aggregator',biz:'Platform Logging Disruption',status:'RESOLVED',sev:'RESOURCE_CONTENTION',start:Date.now()-475200000,dur:60,users:0,mz:['Production'],tags:['team:platform'],hasRCA:true,rca:'log-aggregator',svcs:['log-aggregator'],rec:20,impact:25,noise:true,cloud:'aws',region:'ap-southeast-2'},
];

let PROBLEMS = MOCK_PROBLEMS;
let MTTR_SUMMARY = null;

// ============================================================
// PERSONA CONFIG
// ============================================================
const PMETA = {
  executive:{label:'Executive',icon:'E',color:'#4db8ff',desc:'All non-duplicate incidents | pattern-led view',
    filter:()=>true,
    rank:(a,b)=>((b.users||0)*(b.dur||30))-((a.users||0)*(a.dur||30)),
    cols:['exp','check','biz','cost','users','dur','rec','status']},
  developer:{label:'Developer',icon:'D',color:'#3dd68c',desc:'Service errors | root causes | traces',
    filter:p=>!['Disk I/O'].some(n=>p.title.includes(n)),
    rank:(a,b)=>{const w={AVAILABILITY:5,ERROR:4,PERFORMANCE:3,RESOURCE_CONTENTION:2,CUSTOM_ALERT:1};return (w[b.sev]||0)-(w[a.sev]||0)},
    cols:['exp','check','sev','title','svc','rca','mttr','rec','users','open']},
  sre:{label:'SRE / Platform',icon:'S',color:'#9b8fe4',desc:'Full operational view | all signals | noise analysis',
    filter:()=>true,
    rank:(a,b)=>(b.impact||0)-(a.impact||0),
    cols:['exp','check','sev','title','impact','cost','rec','mttr','users','rca','noise','cloud','open']},
};

// ============================================================
// COST MODEL
// ============================================================
const COST_MODEL_PROFILES = {
  Conservative: {
    severityMultipliers: {AVAILABILITY:0.8,ERROR:0.55,PERFORMANCE:0.22,RESOURCE_CONTENTION:0.1,CUSTOM_ALERT:0.03},
    engineerHourlyRate: 125,
    defaultResponders: 2,
    affectedUserCostPerHour: 2.4,
    fallbackAffectedEntityCost: 0,
    recoveryRate: 0.25,
  },
  Standard: {
    severityMultipliers: {AVAILABILITY:1.0,ERROR:0.7,PERFORMANCE:0.3,RESOURCE_CONTENTION:0.15,CUSTOM_ALERT:0.05},
    engineerHourlyRate: 150,
    defaultResponders: 3,
    affectedUserCostPerHour: 4.8,
    fallbackAffectedEntityCost: 0,
    recoveryRate: 0.35,
  },
  Aggressive: {
    severityMultipliers: {AVAILABILITY:1.25,ERROR:0.9,PERFORMANCE:0.45,RESOURCE_CONTENTION:0.25,CUSTOM_ALERT:0.08},
    engineerHourlyRate: 200,
    defaultResponders: 4,
    affectedUserCostPerHour: 7.2,
    fallbackAffectedEntityCost: 25,
    recoveryRate: 0.5,
  },
};
let activeCostProfile = 'Standard';
let costModel = {...COST_MODEL_PROFILES.Standard, severityMultipliers:{...COST_MODEL_PROFILES.Standard.severityMultipliers}};
let CC = {rev:costModel.affectedUserCostPerHour/60,eng:costModel.engineerHourlyRate,resp:costModel.defaultResponders};

function syncLegacyCostConfig() {
  CC = {
    rev: costModel.affectedUserCostPerHour / 60,
    eng: costModel.engineerHourlyRate,
    resp: costModel.defaultResponders,
  };
}

function applyCostModelProfile(profileName) {
  const profile = COST_MODEL_PROFILES[profileName] || COST_MODEL_PROFILES.Standard;
  activeCostProfile = COST_MODEL_PROFILES[profileName] ? profileName : 'Standard';
  costModel = {...profile, severityMultipliers:{...profile.severityMultipliers}};
  syncLegacyCostConfig();
}

function recoveryRate() {
  return Number.isFinite(costModel.recoveryRate) ? costModel.recoveryRate : 0.35;
}

function recoverableFromCost(cost) {
  return Number.isFinite(cost) && cost > 0 ? Math.round(cost * recoveryRate()) : 0;
}

function calcCost(p){
  const d = Number.isFinite(p?.dur) && p.dur > 0 ? p.dur : 30;
  const m = costModel.severityMultipliers?.[p?.sev] ?? costModel.severityMultipliers?.PERFORMANCE ?? 0.3;
  const userCostPerMinute = (costModel.affectedUserCostPerHour || 0) / 60;
  const userCount = Number.isFinite(p?.users) ? p.users : 0;
  const rev = Math.round(userCount * userCostPerMinute * d * m);
  const fallback = !userCount && costModel.fallbackAffectedEntityCost
    ? Math.round((costModel.fallbackAffectedEntityCost || 0) * m)
    : 0;
  const eng = Math.round((d/60) * (costModel.engineerHourlyRate || 0) * (costModel.defaultResponders || 0));
  return {rev:rev + fallback,eng,total:rev+fallback+eng};
}

function costLineageText(p, cost = calcCost(p)) {
  const duration = Number.isFinite(p?.dur) && p.dur > 0 ? p.dur : 30;
  const severityMultiplier = costModel.severityMultipliers?.[p?.sev] ?? costModel.severityMultipliers?.PERFORMANCE ?? 0.3;
  return [
    `Cost model: ${activeCostProfile}`,
    `affected users: ${Number.isFinite(p?.users) ? p.users : 0}`,
    `duration: ${duration}m`,
    `severity multiplier: ${severityMultiplier}`,
    `responders: ${costModel.defaultResponders || 0}`,
    `engineer rate: ${fmtC(costModel.engineerHourlyRate || 0)}/hr`,
    `calculated impact: ${fmtC(cost.total || 0)}`,
  ].join(' | ');
}

function calcRecurringWaste(ps){
  return ps.filter(p=>p.rec>=60).reduce((s,p)=>s+calcCost(p).total*(p.rec/100),0);
}

// ── Math utilities ──
const arrMean   = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
const arrStddev = a => { if(a.length<2)return 0; const m=arrMean(a); return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length); };
const arrMode   = a => { const c={}; a.forEach(v=>{c[v]=(c[v]||0)+1;}); return Object.entries(c).sort((x,y)=>y[1]-x[1])[0]?.[0]; };
const arrGini   = a => { if(!a.length)return 0; const s=[...a].sort((x,y)=>x-y),n=s.length,sum=s.reduce((t,v)=>t+v,0); if(!sum)return 0; return s.reduce((g,v,i)=>g+v*(2*(i+1)-n-1),0)/(n*sum); };
const arrPercentile = (a, p) => { if(!a.length)return 0; const s=[...a].sort((x,y)=>x-y); return s[Math.min(s.length-1, Math.floor((s.length-1)*p))] ?? 0; };
const clamp     = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

// ── Value Delivered ──
// Estimates engineer effort saved per problem via AI correlation, noise suppression, incident grouping.
function calculateValueBreakdown(p, patternOccurrences=1) {
  const engPerMin = CC.eng/60*CC.resp;
  const mttrSavings           = p.hasRCA ? 45*engPerMin : 0;
  const noiseReductionSavings = p.noise  ? 8*8*engPerMin : 0;
  const aiCorrelationSavings  = patternOccurrences>1 ? ((patternOccurrences-1)*5*engPerMin)/patternOccurrences : 0;
  return {
    mttrSavings:           Math.round(mttrSavings),
    aiCorrelationSavings:  Math.round(aiCorrelationSavings),
    noiseReductionSavings: Math.round(noiseReductionSavings),
    total:                 Math.round(mttrSavings+aiCorrelationSavings+noiseReductionSavings),
  };
}

function calcValueDelivered(p, patternOccurrences=1) {
  const v = calculateValueBreakdown(p, patternOccurrences);
  return {
    rcaSavings:      v.mttrSavings,
    groupingSavings: v.aiCorrelationSavings,
    noiseSavings:    v.noiseReductionSavings,
    total:           v.total,
  };
}

// ── Confidence Scoring ──
function costConfidence(p) {
  if(p.users>0 && p.dur>0) return 0.80;
  if(p.dur>0)              return 0.55;
  return 0.30;
}
function patternConfidence(pattern) {
  return clamp((pattern.qualityScore||0)/100 + clamp((pattern.occurrences-2)/8,0,0.15), 0, 1);
}
function rcaConfidence(p, pattern) {
  if(!p.hasRCA) return 0.15;
  if(!pattern)  return 0.55;
  const c = pattern.rcaConsistency??0;
  return c>=0.8 ? 0.90 : c>=0.5 ? 0.65 : 0.35;
}
function confidenceLevel(score) {
  return score >= 0.75 ? 'HIGH' : score >= 0.5 ? 'MEDIUM' : 'LOW';
}
function confidenceClass(level) {
  return level === 'HIGH' ? 'conf-high' : level === 'MEDIUM' ? 'conf-med' : 'conf-low';
}
function renderConfidenceBadge(level, label='confidence') {
  return `<span class="exec-conf-badge ${confidenceClass(level)}">${level} ${label}</span>`;
}
function calculatePatternConfidence(pattern) {
  return confidenceLevel(patternConfidence(pattern));
}
function calculateCostConfidence(pattern) {
  const problems = pattern.problems || [];
  if (!problems.length) return 'LOW';
  return confidenceLevel(arrMean(problems.map(p => costConfidence(p))));
}
function calculateRCAConfidence(pattern) {
  const problems = pattern.problems || [];
  if (!problems.length) return 'LOW';
  return confidenceLevel(arrMean(problems.map(p => rcaConfidence(p, pattern))));
}
function scoreLabel(score) {
  return score >= 0.65 ? 'HIGH' : score >= 0.40 ? 'MEDIUM' : 'LOW';
}
function calculateConcentration(pattern) {
  if (pattern.concentration) return pattern.concentration;
  if (pattern.concentrationRaw != null) return scoreLabel(pattern.concentrationRaw);
  const purity = pattern.clusterPurity ?? 0;
  const costs = (pattern.problems || []).map(p => calcCost(p).total);
  const costConsistency = arrMean(costs) > 0 ? clamp(1 - arrStddev(costs) / arrMean(costs), 0, 1) : 0;
  return scoreLabel(clamp(purity * 0.5 + costConsistency * 0.5, 0, 1));
}
function calculateFixability(pattern) {
  if (pattern.fixability) return pattern.fixability;
  if (pattern.fixabilityRaw != null) return scoreLabel(pattern.fixabilityRaw);
  const rca = pattern.rcaConsistency ?? 0;
  const stability = pattern.recurrenceStability ?? 0;
  const purity = pattern.clusterPurity ?? 0;
  return scoreLabel(clamp(rca * 0.5 + stability * 0.3 + purity * 0.2, 0, 1));
}
function calculateSystemDirection(costTrend, recurrenceTrend, mttrTrend) {
  const score =
    (costTrend === 'UP' ? 1 : costTrend === 'DOWN' ? -1 : 0) +
    (recurrenceTrend === 'UP' ? 1 : recurrenceTrend === 'DOWN' ? -1 : 0) +
    (mttrTrend === 'UP' ? 1 : mttrTrend === 'DOWN' ? -1 : 0);
  return score >= 1 ? 'DEGRADING' : score <= -1 ? 'IMPROVING' : 'STABLE';
}
function subBucketConfidence(sb) {
  const rcaFrac  = sb.problems.filter(p=>p.hasRCA).length/sb.problems.length;
  const sizeFac  = clamp(sb.problems.length/5,0.2,1.0);
  return clamp(rcaFrac*0.7+sizeFac*0.3,0.10,0.95);
}
function confClass(score) {
  return score>=0.75?'conf-high':score>=0.50?'conf-med':score>=0.25?'conf-low':'conf-vlow';
}
function confLabel(score) {
  return score>=0.75?'':score>=0.50?'~':score>=0.25?'Warning ~':'Warning';
}

function fmtC(n){if(n>=1e6)return`$${(n/1e6).toFixed(1)}M`;if(n>=1e3)return`$${(n/1e3).toFixed(1)}K`;return`$${Math.round(n)}`}
function fmtM(m){if(!Number.isFinite(m)||m<=0)return'-';if(m>=1440)return`${(m/1440).toFixed(m>=14400?0:2)}d`;if(m<60)return Math.round(m)+'m';const h=Math.floor(m/60),r=Math.round(m%60);return r>0?`${h}h ${r}m`:`${h}h`}
function fmtR(ms){const d=Date.now()-ms,m=Math.floor(d/60000);if(m<60)return`${m}m ago`;const h=Math.floor(m/60);if(h<24)return`${h}h ago`;return`${Math.floor(h/24)}d ago`}
const SEV_LBL={AVAILABILITY:'Avail',ERROR:'Error',PERFORMANCE:'Perf',RESOURCE_CONTENTION:'Rsrc',CUSTOM_ALERT:'Custom'};

function validResolvedDurations(ps) {
  return (ps || [])
    .filter(p => p && p.status === 'RESOLVED' && Number.isFinite(p.dur) && p.dur > 0)
    .map(p => p.dur);
}

function mttrSummaryFromProblems(ps) {
  const durs = validResolvedDurations(ps);
  return {
    avg: durs.length ? arrMean(durs) : null,
    median: durs.length ? arrPercentile(durs, .5) : null,
    p85: durs.length ? arrPercentile(durs, .85) : null,
    p95: durs.length ? arrPercentile(durs, .95) : null,
    count: durs.length,
  };
}

function safeMttrSummary(summary, fallbackPs) {
  const fallback = mttrSummaryFromProblems(fallbackPs);
  if (!summary || !Number(summary.count)) return fallback;
  const clean = value => Number.isFinite(value) && value > 0 ? value : null;
  return {
    avg: clean(summary.avg),
    median: clean(summary.median),
    p85: clean(summary.p85),
    p95: clean(summary.p95),
    count: Number(summary.count) || 0,
  };
}

// ============================================================
// DQL DATA LOADER
// ============================================================
function toMs(v) {
  if (!v) return null;
  if (typeof v === 'string') {
    // Grail returns nanosecond precision: "2026-05-28T02:52:00.123456789Z"
    // JS Date only parses up to milliseconds, so truncate extra digits to avoid NaN
    const ms3 = v.replace(/(\.\d{3})\d+(Z)$/, '$1$2').replace(/(\d)(Z)$/, '$1.000$2');
    const t = new Date(ms3).getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof v === 'number') return v > 1e15 ? Math.floor(v / 1e6) : v;
  if (typeof v === 'object' && 'seconds' in v) return v.seconds * 1000 + Math.floor((v.nanos ?? 0) / 1e6);
  return null;
}

function durationToMs(v) {
  if (!v) return null;
  if (typeof v === 'number') {
    if (v > 1e10) return Math.round(v / 1e6);
    if (v > 10000) return Math.round(v);
    return Math.round(v * 1000);
  }
  if (typeof v === 'object' && 'seconds' in v) {
    return (v.seconds || 0) * 1000 + Math.floor((v.nanos || 0) / 1e6);
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return durationToMs(Number(s));
    const iso = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(s);
    if (iso) {
      const [, d='0', h='0', m='0', sec='0'] = iso;
      return Math.round((Number(d)*86400 + Number(h)*3600 + Number(m)*60 + Number(sec)) * 1000);
    }
    const hms = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/.exec(s);
    if (hms) {
      const [, h='0', m='0', sec='0'] = hms;
      return (Number(h)*3600 + Number(m)*60 + Number(sec)) * 1000;
    }
    const days = Number(/(\d+(?:\.\d+)?)\s*d/i.exec(s)?.[1] || 0);
    const hrs  = Number(/(\d+(?:\.\d+)?)\s*h/i.exec(s)?.[1] || 0);
    const mins = Number(/(\d+(?:\.\d+)?)\s*m(?!s)/i.exec(s)?.[1] || 0);
    const secs = Number(/(\d+(?:\.\d+)?)\s*s/i.exec(s)?.[1] || 0);
    const totalSeconds = days*86400 + hrs*3600 + mins*60 + secs;
    return totalSeconds > 0 ? Math.round(totalSeconds * 1000) : null;
  }
  return null;
}

function durationMinutesFromRecord(r, start, rawStatus) {
  if (!['CLOSED', 'RESOLVED'].includes(rawStatus)) return null;
  const resolvedMs = durationToMs(r['resolved_problem_duration']);
  if (resolvedMs > 0) return Math.max(1 / 60, resolvedMs / 60000);
  return null;
}

function durationMinutesFromValue(v) {
  const ms = durationToMs(v);
  return ms > 0 ? ms / 60000 : 0;
}

function getTimeLabel() {
  const v = document.getElementById('timeRange')?.value ?? '7d';
  return v === '7d' ? 'last 7 days' : v === '14d' ? 'last 14 days' : 'last 30 days';
}

async function loadProblems() {
  const timeRange = document.getElementById('timeRange')?.value ?? '7d';
  MTTR_SUMMARY = null;
  try {
    const result = await queryExecutionClient.queryExecute({
      body: {
        query: `fetch dt.davis.problems, from: now()-${timeRange}
| filter dt.davis.is_duplicate == false
| fields event.id, display_id, event.name, event.status, event.category, event.start, event.end,
         dt.davis.impact_level, dt.davis.is_frequent_event, dt.davis.is_duplicate, dt.davis.affected_users_count,
         entity_tags, management_zones, root_cause_entity_name,
         cloud.provider, cloud.region, affected_entity_ids, resolved_problem_duration
| sort event.start desc
| limit 500`,
        requestTimeoutMilliseconds: 15000,
        fetchTimeoutSeconds: 60,
      }
    });

    const records = result?.result?.records;
    if (!records || records.length === 0) return;

    // event.category values: ERROR, AVAILABILITY, SLOWDOWN, CUSTOM_ALERT
    // map to app's sev values: ERROR, AVAILABILITY, PERFORMANCE, RESOURCE_CONTENTION, CUSTOM_ALERT
    const SEV_MAP = { ERROR: 'ERROR', AVAILABILITY: 'AVAILABILITY', SLOWDOWN: 'PERFORMANCE', CUSTOM_ALERT: 'CUSTOM_ALERT' };
    // event.status: OPEN, ACTIVE -> 'OPEN'; CLOSED -> 'RESOLVED'
    const STATUS_MAP = { OPEN: 'OPEN', ACTIVE: 'OPEN', CLOSED: 'RESOLVED', RESOLVED: 'RESOLVED' };
    // dt.davis.impact_level is documented as a string, but some tenants may return an array.
    const IMPACT_RANK = { ENVIRONMENT: 95, APPLICATION: 75, SERVICE: 55, SERVICES: 55, INFRASTRUCTURE: 35, SYNTHETIC: 20 };

    PROBLEMS = records.map((r, i) => {
      const rawStatus = String(r['event.status'] ?? 'CLOSED').toUpperCase();
      const status = STATUS_MAP[rawStatus] ?? 'RESOLVED';

      const start = toMs(r['event.start']) ?? Date.now();
      const dur = durationMinutesFromRecord(r, start, rawStatus);

      const rawImpact = r['dt.davis.impact_level'];
      const impactArr = Array.isArray(rawImpact) ? rawImpact.map(v => String(v).toUpperCase()) : (rawImpact ? [String(rawImpact).toUpperCase()] : []);
      const impact = impactArr.reduce((best, lv) => Math.max(best, IMPACT_RANK[lv] ?? 30), 30);

      const mz = Array.isArray(r['management_zones']) ? r['management_zones'].map(String).filter(Boolean) : [];
      const tags = Array.isArray(r['entity_tags']) ? r['entity_tags'].map(String) : [];
      const entityIds = Array.isArray(r['affected_entity_ids']) ? r['affected_entity_ids'] : [];
      const rca = r['root_cause_entity_name'] ? String(r['root_cause_entity_name']) : null;
      const svcs = rca ? [rca] : entityIds.map(id => String(id).split('-')[0]).filter((v, i, a) => a.indexOf(v) === i);
      const cloud = Array.isArray(r['cloud.provider']) ? (r['cloud.provider'][0] ?? '') : (r['cloud.provider'] ?? '');
      const region = Array.isArray(r['cloud.region']) ? (r['cloud.region'][0] ?? '') : (r['cloud.region'] ?? '');

      return {
        id: String(r['event.id'] ?? r['display_id'] ?? `P-${String(i + 1).padStart(3, '0')}`),
        displayId: String(r['display_id'] ?? r['event.id'] ?? `P-${String(i + 1).padStart(3, '0')}`),
        title: String(r['event.name'] ?? 'Unknown problem'),
        biz: String(r['event.name'] ?? 'Unknown problem'),
        status,
        sev: SEV_MAP[String(r['event.category'] ?? '').toUpperCase()] ?? 'CUSTOM_ALERT',
        start,
        dur,
        users: typeof r['dt.davis.affected_users_count'] === 'number' ? r['dt.davis.affected_users_count'] : (entityIds.length || 0),
        mz: mz.length ? mz : ['Production'],
        tags,
        hasRCA: rca !== null,
        rca,
        svcs,
        affectedEntityIds: entityIds.map(String),
        rec: 0,
        impact,
        noise: r['dt.davis.is_frequent_event'] === true,
        cloud: cloud || 'unknown',
        region: region || '',
      };
    });

    await loadMttrSummary(timeRange);
    patternInsights.clear();
    subBucketInsights.clear();
    render();
    if (typeof renderPatternIntelligence === 'function' && currentView === 'patterns') renderPatternIntelligence();
  } catch (err) {
    console.warn('[OpInt] DQL fetch failed:', err.message ?? err);
    console.warn('[OpInt] cause:', err.cause);
    console.warn('[OpInt] full error:', err);
  }
}

async function loadMttrSummary(timeRange) {
  try {
    const result = await queryExecutionClient.queryExecute({
      body: {
        query: `fetch dt.davis.problems, from: now()-${timeRange}
| filter dt.davis.is_duplicate == false
| filter event.status == "CLOSED" or event.status == "RESOLVED"
| fields resolved_problem_duration
| filter isNotNull(resolved_problem_duration)
| summarize
    resolved_count = count(),
    avg_mttr = avg(resolved_problem_duration),
    median_mttr = percentile(resolved_problem_duration, 50),
    p85_mttr = percentile(resolved_problem_duration, 85),
    p95_mttr = percentile(resolved_problem_duration, 95)`,
        requestTimeoutMilliseconds: 15000,
        fetchTimeoutSeconds: 60,
      }
    });
    const row = result?.result?.records?.[0];
    if (!row) return;
    MTTR_SUMMARY = {
      count: Number(row.resolved_count || 0),
      avg: durationMinutesFromValue(row.avg_mttr),
      median: durationMinutesFromValue(row.median_mttr),
      p85: durationMinutesFromValue(row.p85_mttr),
      p95: durationMinutesFromValue(row.p95_mttr),
    };
  } catch (err) {
    console.warn('[OpInt] MTTR aggregate fetch failed:', err.message ?? err);
  }
}

// ============================================================
// STATE
// ============================================================
let persona='executive';
let selectedIds=new Set();
let expandedIds=new Set();
let expandCache={};
let aiSrc='davis';
let aiState='idle';
let lastAIResult=null;
let remProblem=null;
let awsModalProblem=null;
let davisConversationId=null; // unused, kept for backwards compat
let execValueBreakdownOpen=false;
let execKpiDetail=null;
let patternExplorerState = { selectedId:null, sort:'priority', dir:'desc', search:'', filters:{}, offset:0 };
let execAnalyticalView='map';
let execPatternSelectionMade=false;
let execMetricDrilldown=null;
let patternSearchTimer=null;
let remediationPatternId=null;
let remediationState={ status:'empty', patternId:null, evidence:null, response:null, error:null };
const remediationCache=new Map();
let developerScopeOptions=[];
/** @type {ToolDetectionRow[]} */
let TOOL_DETECTION_ROWS=[];

function isConciseExecView() {
  return persona === 'executive'
    && currentView === 'patterns'
    && new URLSearchParams(window.location.search).get('view') === 'concise';
}

// ============================================================
// RENDER
// ============================================================
function cleanScopeValue(value) {
  const text = String(value || '').trim();
  if (!text || /^(SERVICE|HOST|APPLICATION|PROCESS_GROUP)$/i.test(text)) return '';
  if (/^[A-Z]+-[A-Z0-9]{6,}$/i.test(text)) return '';
  return text;
}

function addDeveloperScope(map, type, label, source, rawValue, problemId) {
  const cleanLabel = cleanScopeValue(label);
  const cleanRaw = cleanScopeValue(rawValue || label);
  if (!cleanLabel || !cleanRaw) return;
  const key = `${type}|${cleanRaw}`;
  const existing = map.get(key) || { type, label:cleanLabel, source, rawValue:cleanRaw, count:0, problemIds:new Set() };
  if (!existing.problemIds.has(problemId)) {
    existing.problemIds.add(problemId);
    existing.count += 1;
  }
  map.set(key, existing);
}

function parseScopeTag(tag) {
  const raw = String(tag || '').trim();
  const [, key='', value=''] = /^([^:=]+)[:=](.+)$/.exec(raw) || [];
  const k = key.toLowerCase();
  const v = cleanScopeValue(value || raw);
  if (!v) return null;
  if (/team|squad/.test(k)) return { type:'team', label:`Team: ${v}`, rawValue:raw };
  if (/owner/.test(k)) return { type:'owner', label:`Owner: ${v}`, rawValue:raw };
  if (/namespace/.test(k)) return { type:'namespace', label:`Namespace: ${v}`, rawValue:raw };
  if (/environment|env|stage/.test(k)) return { type:'environment', label:`Environment: ${v}`, rawValue:raw };
  if (/application|app/.test(k)) return { type:'application', label:`Application: ${v}`, rawValue:raw };
  if (/business|capability|domain/.test(k)) return { type:'business', label:`Business: ${v}`, rawValue:raw };
  if (/deploy|release|version|build/.test(k)) return { type:'deployment', label:`Deployment: ${v}`, rawValue:raw };
  return null;
}

function buildDeveloperScopeTaxonomy(problemRows) {
  const map = new Map();
  (problemRows || []).forEach(p => {
    (p.svcs || []).forEach(s => addDeveloperScope(map, 'service', `Service: ${s}`, 'entity', s, p.id));
    (p.tags || []).forEach(tag => {
      const parsed = parseScopeTag(tag);
      if (parsed) addDeveloperScope(map, parsed.type, parsed.label, 'tag', parsed.rawValue, p.id);
    });
  });
  const priority = { service:1, team:2, owner:3, namespace:4, application:5, environment:6, business:7, deployment:8 };
  return [...map.values()]
    .filter(scope => scope.count > 0)
    .sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 60);
}

function selectedDeveloperScope() {
  const value = document.getElementById('appFilter')?.value || '';
  return developerScopeOptions.find(scope => `${scope.type}|${scope.rawValue}` === value) || null;
}

function applyDeveloperScopeFilter(rows, selectedScope) {
  if (!selectedScope) return rows;
  return (rows || []).filter(p => {
    if (selectedScope.type === 'service') return (p.svcs || []).some(s => s === selectedScope.rawValue || `Service: ${s}` === selectedScope.label);
    return (p.tags || []).includes(selectedScope.rawValue);
  });
}

function syncDeveloperScopeFilter() {
  const select = document.getElementById('appFilter');
  if (!select) return;
  if (persona !== 'developer') {
    select.style.display = 'none';
    select.value = '';
    return;
  }
  select.style.display = '';
  const current = select.value;
  developerScopeOptions = buildDeveloperScopeTaxonomy(PROBLEMS);
  if (!developerScopeOptions.length) {
    select.innerHTML = '<option value="">No developer scopes found</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML = '<option value="">All Developer Scope</option>' + developerScopeOptions
    .map(scope => `<option value="${attrText(`${scope.type}|${scope.rawValue}`)}">${attrText(`${scope.label} - ${scope.count} problems`)}</option>`)
    .join('');
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function getFiltered(){
  const m=PMETA[persona];
  const scoped = persona === 'developer'
    ? applyDeveloperScopeFilter(PROBLEMS, selectedDeveloperScope())
    : PROBLEMS;
  return scoped.filter(m.filter).sort(m.rank);
}

function render(){
  syncDeveloperScopeFilter();
  const ps=getFiltered();
  // persona bar
  const m=PMETA[persona];
  document.body.classList.toggle('concise-exec', isConciseExecView());
  document.body.classList.toggle('exec-persona', persona === 'executive');
  document.documentElement.style.setProperty('--persona',m.color);
  document.getElementById('pbarIcon').textContent=m.icon;
  document.getElementById('pbarText').innerHTML=`<strong>${m.label} View</strong> - ${m.desc}`;
  if(persona==='executive'){
    const ep=detectPatterns(ps).patterns;
    document.getElementById('pbarChip').textContent=`${ep.length} pattern${ep.length!==1?'s':''} | ${ps.length} problems`;
  }
  else document.getElementById('pbarChip').textContent=`${ps.length} of ${PROBLEMS.length} visible`;
  // cost banner
  const showCost=persona!=='developer' && !(persona === 'executive' && currentView === 'patterns');
  document.getElementById('costBanner').classList.toggle('hidden',!showCost);
  if(showCost) renderCostBanner(ps);
  // kpis
  renderKPIs(ps);
  renderTopPatternsSnapshot(ps);
  // table
  renderTable(ps);
  // update tab counts
  document.getElementById('explorerTabCount').textContent = ps.length;
  const { patterns } = detectPatterns(ps);
  document.getElementById('patternTabCount').textContent = patterns.length;
  // if on pattern view, re-render it
  if (currentView === 'patterns') renderPatternIntelligence();
}

// ── KPIs ──
function renderKPIs(ps){
  if (persona === 'executive' && currentView === 'patterns') {
    document.getElementById('kpiRow').innerHTML = '';
    const kpiDetails = document.getElementById('kpiDetails');
    if (kpiDetails) kpiDetails.innerHTML = '';
    return;
  }
  const mttr = mttrSummaryFromProblems(ps);
  const appFilter = document.getElementById('appFilter').value;
  const execMttr = persona === 'executive' && !appFilter && MTTR_SUMMARY
    ? safeMttrSummary(MTTR_SUMMARY, ps)
    : mttr;
  const costs=ps.map(calcCost),total=costs.reduce((a,c)=>a+c.total,0);
  const waste=calcRecurringWaste(ps);
  const open=ps.filter(p=>p.status==='OPEN').length;
  const noisy=ps.filter(p=>p.noise).length;
  const miss=ps.filter(p=>!p.hasRCA).length;
  const rec=ps.filter(p=>p.rec>=60).length;
  const svcs=new Set(ps.flatMap(p=>p.svcs)).size;
  const patterns=detectPatterns(ps).patterns;
  const patternOccurrences=patterns.reduce((s, pat)=>s+pat.occurrences,0);
  const oneOffCount=ps.length-patternOccurrences;
  const openPatterns=patterns.filter(pat=>pat.problems.some(p=>p.status==='OPEN'));
  const highImpactPatterns=patterns.filter(pat=>isHighImpactPattern(pat, patterns));
  const totalPatternCost=patterns.reduce((s, pat)=>s+patternCost(pat),0);
  const session=calcSessionMetrics(ps, patterns);
  const potentialSavings=patterns.length ? recoverableFromCost(totalPatternCost) + session.valueDeliveredTotal : 0;
  const highImpactOccurrences=highImpactPatterns.reduce((s, pat)=>s+pat.occurrences,0);
  const KPIS={
    executive:[
      {lbl:'Distinct Incident Patterns',val:patterns.length,sub:`${openPatterns.length} active now`,c:'kc-amber',mode:'patterns',actionText:execKpiDetail==='patterns'?'Hide patterns':'View patterns'},
      {lbl:'High-Impact Patterns',val:highImpactPatterns.length,sub:`${highImpactOccurrences} pattern occurrences`,c:'kc-coral',mode:'impact',actionText:execKpiDetail==='impact'?'Hide impact':'View high impact'},
      {lbl:'Total Problems',val:ps.length,sub:`${patternOccurrences} grouped | ${oneOffCount} one-off`,c:'kc-blue',mode:'occurrences',actionText:execKpiDetail==='occurrences'?'Hide problems':'View problems'},
      {lbl:'Median MTTR',val:fmtM(execMttr.median),sub:`p85: ${fmtM(execMttr.p85)} | ${execMttr.count} resolved`,c:'kc-teal',mode:'mttr',actionText:execKpiDetail==='mttr'?'Hide MTTR':'View MTTR drivers'},
    ],
    developer:[
      {lbl:'Active Problems',val:ps.length,sub:`${open} open`,c:'kc-blue',mode:'dev-open',actionText:execKpiDetail==='dev-open'?'Hide details':'View details'},
      {lbl:'Services Affected',val:svcs,sub:'unique entities',c:'kc-coral',mode:'dev-services',actionText:execKpiDetail==='dev-services'?'Hide details':'View details'},
      {lbl:'Missing Root Cause',val:miss,sub:`${ps.length ? Math.round(miss/ps.length*100) : 0}% of total`,c:'kc-amber',mode:'dev-rca',actionText:execKpiDetail==='dev-rca'?'Hide details':'View details'},
      {lbl:'Median MTTR',val:fmtM(mttr.median),sub:`p85: ${fmtM(mttr.p85)} | ${mttr.count} resolved`,c:'kc-green',mode:'dev-mttr',actionText:execKpiDetail==='dev-mttr'?'Hide details':'View details'},
    ],
    sre:[
      {lbl:'Total Problems',val:ps.length,sub:`${open} open now`,c:'kc-blue',mode:'sre-total',actionText:execKpiDetail==='sre-total'?'Hide details':'View details'},
      {lbl:'Recurring Waste',val:fmtC(waste),sub:'cost of recurrence',c:'kc-coral',badge:{t:'actionable',cls:'badge-up'},mode:'sre-waste',actionText:execKpiDetail==='sre-waste'?'Hide details':'View details'},
      {lbl:'Noisy Alerts',val:noisy,sub:'noise candidates',c:'kc-amber',mode:'sre-noise',actionText:execKpiDetail==='sre-noise'?'Hide details':'View details'},
      {lbl:'Median MTTR',val:fmtM(mttr.median),sub:`p85: ${fmtM(mttr.p85)} | ${mttr.count} resolved`,c:'kc-violet',mode:'sre-mttr',actionText:execKpiDetail==='sre-mttr'?'Hide details':'View details'},
    ],
  };
  if (persona === 'executive') {
    KPIS.executive = [
      {lbl:'Distinct Incident Patterns',val:patterns.length,sub:`${patternOccurrences} grouped | ${openPatterns.length} active`,c:'kc-amber'},
      {lbl:'Cost Exposure',val:fmtC(totalPatternCost),sub:`${highImpactPatterns.length} high-impact pattern${highImpactPatterns.length!==1?'s':''}`,c:'kc-coral'},
      {lbl:'Potential Savings',val:fmtC(potentialSavings),sub:'Modeled recurring reduction',c:'kc-green'},
      {lbl:'Median MTTR',val:fmtM(execMttr.median),sub:`p85: ${fmtM(execMttr.p85)} | ${execMttr.count} resolved`,c:'kc-teal'},
    ];
  }
  if (persona === 'executive') {
    const riskBacklog = patterns.filter(pat => patternOpenCount(pat) > 0).length;
    KPIS.executive = [
      {lbl:'Distinct Incident Patterns',val:patterns.length,sub:`${openPatterns.length} active pattern${openPatterns.length!==1?'s':''}`,c:'kc-amber'},
      {lbl:'Grouped Problems',val:patternOccurrences,sub:`${ps.length} total | ${oneOffCount} one-off`,c:'kc-blue'},
      {lbl:'Cost Exposure',val:fmtC(totalPatternCost),sub:`${highImpactPatterns.length} high-impact pattern${highImpactPatterns.length!==1?'s':''}`,c:'kc-coral'},
      {lbl:'Potential Savings',val:fmtC(potentialSavings),sub:'Modeled recurring reduction',c:'kc-green'},
      {lbl:'Operational Risk Backlog',val:riskBacklog,sub:'Patterns with open incidents',c:'kc-violet'},
      {lbl:'Median MTTR',val:fmtM(execMttr.median),sub:`p85: ${fmtM(execMttr.p85)} | ${execMttr.count} resolved`,c:'kc-teal'},
    ];
  }
  if (persona === 'executive') {
    const riskBacklog = patterns.filter(pat => patternOpenCount(pat) > 0).length;
    const execMedian = execMttr.median;
    const execP85 = execMttr.p85;
    KPIS.executive = [
      {lbl:'Distinct Incident Patterns',val:patterns.length,sub:`${patternOccurrences} grouped | ${openPatterns.length} active`,c:'kc-amber'},
      {lbl:'Grouped Problems',val:patternOccurrences,sub:`${ps.length} total incidents analyzed`,c:'kc-blue'},
      {lbl:'Cost Exposure',val:fmtC(totalPatternCost),sub:`${highImpactPatterns.length} high-impact pattern${highImpactPatterns.length!==1?'s':''}`,c:'kc-coral'},
      {lbl:'Potential Savings',val:fmtC(potentialSavings),sub:'Estimated recoverable value',c:'kc-green'},
      {lbl:'Operational Risk Backlog',val:riskBacklog,sub:'Patterns with active or open incidents',c:'kc-violet'},
      {lbl:'Median MTTR',val:fmtM(execMedian),sub:`p85 ${fmtM(execP85)} | ${execMttr.count} resolved`,c:'kc-teal',badge:{t:execP85 ? `Long tail - 15% exceed ${fmtM(execP85)}` : 'No resolved duration data',cls:'badge-up'}},
    ];
  }
  document.getElementById('kpiRow').innerHTML=KPIS[persona].map(k=>`
    <div class="kcard ${k.c} fade-in ${execKpiDetail===k.mode?'selected':''}" ${k.mode?`role="button" tabindex="0" aria-pressed="${execKpiDetail===k.mode}" data-action="toggleExecKpiDetail" data-mode="${k.mode}"`:''}>
      <div class="k-lbl">${k.lbl}</div>
      <div class="k-val">${k.val}</div>
      <div class="k-sub">${k.sub}${k.badge?`<span class="badge ${k.badge.cls}">${k.badge.t}</span>`:''}</div>
      ${k.mode?`<div class="k-action ${execKpiDetail===k.mode?'open':''}">${k.actionText}</div>`:''}
    </div>`).join('');
  const kpiDetails = document.getElementById('kpiDetails');
  if (kpiDetails) {
    kpiDetails.innerHTML = execKpiDetail ? renderPersonaKpiDetail(persona, execKpiDetail, ps) : '';
  }
}

function renderTopPatternsSnapshot(ps) {
  const el = document.getElementById('topPatternsSnapshot');
  if (!el) return;
  if (persona === 'executive' && currentView === 'patterns') {
    el.innerHTML = '';
    return;
  }
  if (persona !== 'executive' || currentView !== 'patterns') {
    el.innerHTML = '';
    return;
  }

  {
    const patterns = detectPatterns(ps).patterns;
    const ranked = [...patterns]
      .map(pat => ({ pat, score: patternPriorityScore(pat, patterns) }))
      .sort((a, b) => b.score - a.score);
    const session = calcSessionMetrics(ps, patterns);
    const totalPatternCost = patterns.reduce((s, pat) => s + patternCost(pat), 0);
    const potentialSavings = patterns.length ? recoverableFromCost(totalPatternCost) + session.valueDeliveredTotal : 0;
    const riskBacklog = ranked.filter(x => patternOpenCount(x.pat) > 0).length;
    const patternOccurrences = patterns.reduce((s, pat) => s + pat.occurrences, 0);
    const selectedPattern = patterns.find(p => p.id === patternExplorerState.selectedId) || ranked[0]?.pat;
    const focusPattern = ranked[0]?.pat;
    const focusRecoverable = focusPattern ? patternRecoverableValue(focusPattern) : 0;
    el.innerHTML = `
      <div class="snap-head narrative">
        <div>
          <div class="snap-title">${ps.length} problems reduced to ${patterns.length} recurring operational pattern${patterns.length!==1?'s':''}</div>
          <div class="snap-sub">${patternOccurrences} grouped incidents | ${fmtC(totalPatternCost)} cost exposure | ${fmtC(potentialSavings)} potential savings | ${riskBacklog} operational risk backlog</div>
        </div>
        <div class="snap-actions">
          <button class="snap-cta" data-action="focusPatternExplorer">Open Pattern Explorer</button>
          <button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${selectedPattern?.id || ''}" ${selectedPattern ? '' : 'disabled'}>Get Remediation Path</button>
        </div>
      </div>
      ${focusPattern ? `
      <div class="focus-card">
        <div>
          <div class="focus-eyebrow">Recommended Focus This Week</div>
          <div class="focus-title">${focusPattern.title}</div>
          <div class="focus-sub">${focusPattern.occurrences} occurrences | ${fmtC(patternCost(focusPattern))} exposure | ${patternOpenCount(focusPattern)} open incidents</div>
        </div>
        <div class="focus-value">
          <span>Estimated recoverable value</span>
          <strong>${fmtC(focusRecoverable)}</strong>
        </div>
        <div class="snap-actions">
          <button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${focusPattern.id}">Get Remediation Path</button>
          <button class="snap-cta" data-action="focusPatternExplorer">Open Pattern Explorer</button>
        </div>
      </div>` : ''}`;
    return;
  }

  const patterns = detectPatterns(ps).patterns;
  const ranked = [...patterns]
    .map(pat => ({ pat, score: patternPriorityScore(pat, patterns) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3);
  const session = calcSessionMetrics(ps, patterns);
  const totalPatternCost = patterns.reduce((s, pat) => s + patternCost(pat), 0);
  const potentialSavings = patterns.length ? recoverableFromCost(totalPatternCost) + session.valueDeliveredTotal : 0;
  const riskBacklog = ranked.filter(x => patternOpenCount(x.pat) > 0).length;
  const patternOccurrences = patterns.reduce((s, pat) => s + pat.occurrences, 0);
  const topPattern = top[0]?.pat;
  const selectedPattern = patterns.find(p => p.id === patternExplorerState.selectedId) || topPattern;

  const rows = top.map(({ pat, score }, i) => `
    <div class="snap-row ${pat.id === selectedPattern?.id ? 'selected' : ''}" data-action="selectPatternRow" data-pid="${pat.id}">
      <div class="snap-rank">#${i + 1}</div>
      <div>
        <div class="snap-name">${pat.title}</div>
        <div class="snap-meta">${highImpactReason(pat, patterns) || `Priority score ${score}`}</div>
      </div>
      <div class="snap-num">${pat.occurrences}x</div>
      <div class="snap-num">${fmtC(patternCost(pat))}</div>
      <div class="snap-num">${patternOpenCount(pat)}</div>
      <div class="snap-num">${patternConfidenceScore(pat)}</div>
      <div class="snap-trend ${pat.trend === 'INCREASING' ? 'trend-up' : pat.trend === 'DECREASING' ? 'trend-dn' : 'trend-stable'}">${pat.trend[0] + pat.trend.slice(1).toLowerCase()}</div>
    </div>`).join('');

  el.innerHTML = `
    <div class="snap-head">
      <div>
        <div class="snap-title">Recurring Pattern Summary</div>
        <div class="snap-sub">${patternOccurrences} grouped problems from ${ps.length} total | ${riskBacklog} operational risk backlog</div>
      </div>
      <div class="snap-actions">
        <button class="snap-cta" data-action="focusPatternExplorer">Open Pattern Explorer</button>
        <button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${selectedPattern?.id || ''}" ${selectedPattern ? '' : 'disabled'}>Get Remediation Path</button>
      </div>
    </div>
    <div class="snap-body">
      <div class="snap-list">
        <div class="snap-row snap-row-head">
          <div>Rank</div><div>Pattern</div><div>Occ</div><div>Cost</div><div>Open</div><div>Conf</div><div>Trend</div>
        </div>
        ${rows || '<div class="exec-empty">No recurring patterns detected in the current filter.</div>'}
      </div>
    </div>`;
}

// ── COST BANNER ──
function renderCostBanner(ps){
  if(persona==='executive'){
    const patterns=detectPatterns(ps).patterns;
    const patternOccurrences=patterns.reduce((s, pat)=>s+pat.occurrences,0);
    const oneOffCount=ps.length-patternOccurrences;
    const openPatterns=patterns.filter(pat=>pat.problems.some(p=>p.status==='OPEN'));
    const hiImpact=patterns.filter(pat=>isHighImpactPattern(pat, patterns));
    const appFilter = document.getElementById('appFilter').value;
    const bannerMttr=persona==='executive'&&!appFilter&&MTTR_SUMMARY
      ? safeMttrSummary(MTTR_SUMMARY, ps)
      : mttrSummaryFromProblems(ps);
    document.getElementById('cbHead').textContent=`${patterns.length} distinct incident pattern${patterns.length!==1?'s':''} across ${patternOccurrences} grouped problems in the ${getTimeLabel()}`;
    document.getElementById('cbSub').textContent=`${ps.length} total problems | ${oneOffCount} one-off | ${openPatterns.length} active patterns | ${hiImpact.length} high-impact patterns | Cost model: ${activeCostProfile}, recovery ${Math.round(recoveryRate()*100)}%`;
    document.getElementById('cbStats').innerHTML=`
      <div class="cb-stat"><div class="cb-stat-val">${patterns.length}</div><div class="cb-stat-lbl">Incident Patterns</div></div>
      <div class="cb-stat"><div class="cb-stat-val" style="color:var(--amber)">${openPatterns.length}</div><div class="cb-stat-lbl">Active Now</div></div>
      <div class="cb-stat"><div class="cb-stat-val recurring">${hiImpact.length}</div><div class="cb-stat-lbl">High Impact</div></div>
      <div class="cb-stat"><div class="cb-stat-val">${fmtM(bannerMttr.median)}</div><div class="cb-stat-lbl">Median MTTR</div></div>`;
    return;
  }
  const costs=ps.map(calcCost);
  const rev=costs.reduce((a,c)=>a+c.rev,0);
  const eng=costs.reduce((a,c)=>a+c.eng,0);
  const waste=calcRecurringWaste(ps);
  const total=rev+eng;
  document.getElementById('cbHead').textContent=`Estimated ${fmtC(total)} operational losses this period`;
  document.getElementById('cbSub').textContent=`${ps.filter(p=>p.rec>=60).length} recurring issues | ${ps.filter(p=>p.status==='OPEN').length} still open | Cost model: ${activeCostProfile}, recovery ${Math.round(recoveryRate()*100)}%`;
  document.getElementById('cbStats').innerHTML=`
    <div class="cb-stat" title="Direct revenue loss from affected users x duration x severity"><div class="cb-stat-val">${fmtC(rev)}</div><div class="cb-stat-lbl">Revenue Loss</div></div>
    <div class="cb-stat" title="Engineering time: MTTR x rate x responders"><div class="cb-stat-val">${fmtC(eng)}</div><div class="cb-stat-lbl">Eng Cost</div></div>
    <div class="cb-stat" title="Cost of recurring problems you haven't fixed - this money will be spent again"><div class="cb-stat-val recurring">${fmtC(waste)}</div><div class="cb-stat-lbl">Recurring Waste</div></div>`;
}

// ── TABLE ──
const HDR={exp:'',check:'',biz:'Business Incident',title:'Problem',sev:'Severity',cost:'Est. Cost',users:'Users Affected',dur:'Duration',rec:'Recurrence',status:'Status',svc:'Service',rca:'Root Cause',mttr:'MTTR',open:'',impact:'Impact',noise:'Noise?',cloud:'Cloud'};

// ── EXECUTIVE GROUPING ──
function groupForExecutive(ps) {
  const { patterns } = detectPatterns(ps);
  return patterns.map(pat => {
    const items = pat.problems;
    const openItems = items.filter(p => p.status === 'OPEN');
    const resolved = items.filter(p => p.status === 'RESOLVED' && p.dur);
    const avgDur = resolved.length ? Math.round(resolved.reduce((s,p)=>s+(p.dur||0),0)/resolved.length) : null;
    const lastSeen = pat.lastSeen;
    const firstSeen = pat.firstSeen;
    const impact = Math.max(...items.map(p => p.impact||0));
    const ic = impact>=75?'hi':impact>=45?'md':'lo';
    const sev = items.reduce((best,p)=>{
      const w={AVAILABILITY:5,ERROR:4,PERFORMANCE:3,RESOURCE_CONTENTION:2,CUSTOM_ALERT:1};
      return (w[p.sev]||0)>(w[best]||0)?p.sev:best;
    }, items[0].sev);
    const status = openItems.length > 0 ? 'OPEN' : 'RESOLVED';
    // Pick a representative problem ID for row click
    const repId = (openItems[0] || items[items.length-1]).id;
    // Days since first seen
    const ageMs = Date.now() - firstSeen;
    const ageDays = Math.floor(ageMs / 86400000);
    // Trend: split selected timeframe in half, compare occurrence rates
    const rangeDays = parseInt(document.getElementById('timeRange')?.value ?? '7d', 10);
    const halfDays  = rangeDays / 2;
    const midpoint  = Date.now() - halfDays * 86400000;
    const recentCount = items.filter(p => p.start >= midpoint).length;
    const priorCount  = items.filter(p => p.start <  midpoint).length;
    const recentRate  = recentCount / halfDays;
    const priorRate   = priorCount  / halfDays;
    // Guardrails: need both a meaningful ratio AND ≥2 absolute difference to avoid
    // noise from low-volume patterns (e.g. 0->1 or 1->2 should not trigger worsening)
    const delta = recentCount - priorCount;
    let trend;
    if (priorRate === 0 && recentCount >= 3) trend = 'worsening';   // brand-new pattern, needs ≥3 to flag
    else if (priorRate === 0) trend = 'stable';
    else {
      const ratio = recentRate / priorRate;
      const significant = Math.abs(delta) >= 2;                     // at least 2 extra/fewer events
      trend = (ratio >= 1.5 && significant) ? 'worsening'
            : (ratio <= 0.5 && significant) ? 'improving'
            : 'stable';
    }
    return { key:pat.id, title:pat.title, status, count:pat.occurrences, openCount:openItems.length,
             sev, impact, ic, avgDur, lastSeen, firstSeen, ageDays, repId,
             trend, recentCount, priorCount, pattern: pat };
  }).sort((a,b)=>{
    // Open first, then by impact desc
    if(a.status!==b.status) return a.status==='OPEN'?-1:1;
    return b.impact-a.impact;
  });
}

const EXEC_TREND = {
  worsening: { icon: 'up', label: 'Worsening', color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.25)' },
  stable:    { icon: '->', label: 'Stable',    color: '#94a3b8', bg: 'rgba(148,163,184,.10)', border: 'rgba(148,163,184,.20)' },
  improving: { icon: 'down', label: 'Improving', color: '#34d399', bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.25)' },
};

function renderExecutiveTable(ps) {
  document.getElementById('tHead').innerHTML=`<tr>
    <th>Incident Pattern</th>
    <th style="width:120px">Occurrences</th>
    <th style="width:80px">Severity</th>
    <th style="width:80px">Impact</th>
    <th style="width:110px">Last Seen</th>
    <th style="width:90px">Avg Duration</th>
    <th style="width:110px">30-Day Trend</th>
  </tr>`;
  const groups = groupForExecutive(ps);
  let rows = '';
  groups.forEach(g => {
    const occLabel = g.openCount > 0
      ? `<span style="color:var(--amber);font-weight:600">${g.openCount} open</span>&nbsp;/ ${g.count} total`
      : `${g.count}x`;
    const tr = EXEC_TREND[g.trend] || EXEC_TREND.stable;
    const trendChip = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:5px;background:${tr.bg};border:1px solid ${tr.border};color:${tr.color}">${tr.icon} ${tr.label}</span>`;
    const subtitle = g.trend === 'worsening'
      ? `<span style="font-size:10px;color:var(--text-3);display:block;margin-top:2px">${g.recentCount} in last 15d vs ${g.priorCount} prior</span>`
      : g.trend === 'improving'
      ? `<span style="font-size:10px;color:var(--text-3);display:block;margin-top:2px">${g.recentCount} in last 15d vs ${g.priorCount} prior</span>`
      : '';
    rows += `<tr class="prob-row" data-action="onRowClick" data-pid="${g.repId}">
      <td class="tdp" style="max-width:300px;font-weight:${g.status==='OPEN'?'600':'400'}">
        <span class="sdot ${g.status}"></span>${g.title}
        ${g.ageDays>0?`<span style="font-size:10px;color:var(--text-3);margin-left:6px">| ${g.ageDays}d pattern</span>`:''}
      </td>
      <td class="tdm" style="font-size:12px">${occLabel}</td>
      <td><span class="sev ${g.sev}">${SEV_LBL[g.sev]||g.sev}</span></td>
      <td><span class="ic ${g.ic}">${g.impact}</span></td>
      <td class="tdm" style="font-size:11px">${fmtR(g.lastSeen)}</td>
      <td class="tdm">${g.avgDur?fmtM(g.avgDur):'<span style="color:var(--amber)">Ongoing</span>'}</td>
      <td>${trendChip}${subtitle}</td>
    </tr>`;
  });
  document.getElementById('tBody').innerHTML = rows || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-3)">No incidents in selected period</td></tr>';
  updateAnalyzeBtns();
}

function renderTable(ps){
  if(persona==='executive'){renderExecutiveTable(ps);return;}
  const cols=PMETA[persona].cols;
  document.getElementById('tHead').innerHTML=`<tr>${cols.map(c=>`<th>${HDR[c]||c}</th>`).join('')}</tr>`;
  let rows='';
  ps.forEach((p,idx)=>{
    const cost=calcCost(p);
    const sel=selectedIds.has(p.id);
    const exp=expandedIds.has(p.id);
    const ic=p.impact>=75?'hi':p.impact>=45?'md':'lo';
    const CELLS={
      exp:`<td><button class="exp-btn ${exp?'open':''}" data-action="toggleExpand" data-pid="${p.id}">></button></td>`,
      check:`<td><input class="rc" type="checkbox" ${sel?'checked':''} data-action="toggleSel" data-pid="${p.id}"></td>`,
      biz:`<td class="tdp" style="max-width:260px"><span class="sdot ${p.status}"></span>${p.biz}</td>`,
      title:`<td class="tdp" style="max-width:250px;font-size:12px"><span class="sdot ${p.status}"></span>${p.title}</td>`,
      sev:`<td><span class="sev ${p.sev}">${SEV_LBL[p.sev]}</span></td>`,
      cost:`<td class="ccell" title="${attrText(costLineageText(p, cost))}">${fmtC(cost.total)}</td>`,
      users:`<td class="tdm">${p.users>0?p.users.toLocaleString():'-'}</td>`,
      dur:`<td class="tdm">${p.dur?fmtM(p.dur):`<span style="color:var(--amber)">Ongoing</span>`}</td>`,
      mttr:`<td class="tdm">${p.dur?fmtM(p.dur):'-'}</td>`,
      rec:`<td><div class="rb"><div class="rt"><div class="rf" style="width:${p.rec}%"></div></div><span style="font-size:11px;font-family:var(--mono);color:var(--text-3)">${p.rec}</span></div></td>`,
      status:`<td><span class="sdot ${p.status}"></span><span style="font-size:11px;color:var(--text-3)">${p.status}</span></td>`,
      svc:`<td style="font-size:11px;color:var(--text-3)">${p.svcs.join(', ')}</td>`,
      rca:`<td>${p.hasRCA?`<span style="font-size:11px;font-family:var(--mono);color:var(--text-2)">${p.rca}</span>`:`<span class="rca-miss">Warning Missing</span>`}</td>`,
      open:`<td><span class="lbtn" data-action="openP" data-pid="${p.id}">↗</span></td>`,
      impact:`<td><span class="ic ${ic}">${p.impact}</span></td>`,
      noise:`<td>${p.noise?`<span class="nf">Warning Yes</span>`:''}</td>`,
      cloud:`<td><span style="font-size:10px;color:#ff9900;font-family:var(--mono)">${p.cloud?.toUpperCase()??'-'}</span></td>`,
    };
    rows+=`<tr class="prob-row ${sel?'selected':''}" data-action="onRowClick" data-pid="${p.id}">
      ${cols.map(c=>CELLS[c]||'<td>-</td>').join('')}
    </tr>`;
    if(exp){
      const colCount=cols.length;
      rows+=`<tr class="exp-row"><td colspan="${colCount}"><div class="exp-content" id="exp-${p.id}">${renderExpContent(p)}</div></td></tr>`;
    }
  });
  document.getElementById('tBody').innerHTML=rows || `<tr><td colspan="${cols.length}" style="text-align:center;padding:32px;color:var(--text-3)">No problems in selected period</td></tr>`;
  updateAnalyzeBtns();
}

// ── EXPANSION CONTENT ──
function renderExpContent(p){
  const cache=expandCache[p.id];
  if(!cache){
    // Trigger async load
    setTimeout(()=>loadExpSummary(p),50);
    return`<div class="exp-loading"><div class="exp-spinner"></div><span>Davis CoPilot summarising...</span></div>`;
  }
  const cloudTag=p.cloud?`<span class="cloud-tag">Cloud ${p.cloud.toUpperCase()} | ${p.region}</span>`:'';
  return`
    <div class="exp-summary">${cache.summary}</div>
    <div class="exp-topfix">
      <span class="exp-fix-label">✅ Top Fix</span>
      <span class="exp-fix-text">${cache.topFix}</span>
      ${cache.dynatraceFeature?`<span class="ai-rec-feature">Dynatrace: ${cache.dynatraceFeature}</span>`:''}
    </div>
    <div class="exp-actions">
      ${cloudTag}
      <button class="exp-ai-btn exp-davis" data-action="deepAnalyze" data-pid="${p.id}">AI Deep Analysis</button>
      <button class="exp-ai-btn exp-ext" data-action="extTriage" data-pid="${p.id}">🔌 External AI Triage</button>
      ${p.cloud==='aws'?`<button class="exp-ai-btn exp-aws" data-action="showRemPanel" data-pid="${p.id}">🟠 AWS DevOps Agent</button>`:''}
    </div>`;
}

async function loadExpSummary(p){
  try{
    const result=await callInlineAI(p,persona);
    expandCache[p.id]=result;
  }catch(e){
    expandCache[p.id]=getFallbackInline(p,persona);
  }
  const el=document.getElementById(`exp-${p.id}`);
  if(el) el.innerHTML=renderExpContent(p);
}

// ── REMEDIATION PANEL ──

// ---- Problem Classifier ----
// Maps problem signals -> RESOURCE | CONFIG | CODE_DEFECT | DEPENDENCY | UNKNOWN
const PROBLEM_TYPE_SIGNALS = {
  RESOURCE:    ['cpu spike','memory leak','oomkilled','disk i/o','gc pause','heap','resource saturation','out of memory','resource contention'],
  CONFIG:      ['connection pool','timeout','max_connections','configuration','thread pool','queue depth','rate limit','pool exhausted'],
  CODE_DEFECT: ['nullpointerexception','exception','error rate','failure rate','javascript error','stack trace','unhandled','crash','assertion','runtime error'],
  DEPENDENCY:  ['external api','shipping-provider','third-party','downstream','upstream','dependency','integration','webhook'],
};

function classifyProblem(p) {
  const titleLower = p.title.toLowerCase();
  const tags = (p.tags || []).join(' ').toLowerCase();
  const combined = titleLower + ' ' + tags;

  for (const [type, signals] of Object.entries(PROBLEM_TYPE_SIGNALS)) {
    if (signals.some(s => combined.includes(s))) return type;
  }

  // Fallback: use severity + RCA presence
  if (!p.hasRCA) return 'UNKNOWN';
  if (p.sev === 'RESOURCE_CONTENTION') return 'RESOURCE';
  if (p.sev === 'ERROR') return 'CODE_DEFECT';
  if (p.sev === 'PERFORMANCE') return 'CONFIG';
  return 'UNKNOWN';
}

// ---- Infrastructure Detector ----
// In production: reads from Dynatrace entity properties
// p.cloud + p.k8s + p.hostType derived from entity metadata
function detectInfrastructure(p) {
  // Production: entitiesClient().getEntity(rootCauseEntityId)
  //   -> properties.cloudType (AWS | AZURE | GCP | null)
  //   -> properties.awsRegion / azureLocation / gcpZone
  //   -> properties.kubernetesCluster (present = k8s)
  //   -> osType (LINUX | WINDOWS)
  const cloud = p.cloud || null;
  const isK8s = p.tags && p.tags.some(t => t.includes('kubernetes') || t.includes('k8s'));
  return {
    cloud,           // 'aws' | 'azure' | 'gcp' | null
    isK8s,
    isLinux: !cloud && !isK8s,
    region: p.region || null,
    label: cloud ? cloud.toUpperCase() + (p.region ? ' | ' + p.region : '') : isK8s ? 'Kubernetes' : 'Linux Host',
    chipClass: cloud === 'aws' ? 'aws' : cloud === 'azure' ? 'azure' : cloud === 'gcp' ? 'gcp' : isK8s ? 'k8s' : 'linux',
    icon: cloud === 'aws' ? '🟠' : cloud === 'azure' ? '🔵' : cloud === 'gcp' ? '🔵' : isK8s ? '☸' : '🐧',
  };
}

// ---- Option Resolver ----
// Returns ordered list of remediation options based on infra + problem type
function resolveOptions(p, infra, problemType) {
  const options = [];
  const unavailable = [];

  // ── DYNATRACE WORKFLOWS - always available ──
  options.push({
    id: 'dt-workflows',
    icon: 'Lightning',
    label: 'Dynatrace Workflows',
    tier: 'semi',
    time: '~10–20 min',
    desc: 'Native Dynatrace automation - trigger remediation actions, notifications, and runbooks directly from the problem without any external integration.',
    confidence: problemType === 'UNKNOWN' ? 30 : problemType === 'CODE_DEFECT' ? 45 : 75,
    actionLabel: 'Configure Workflow',
    actionClass: 'act-semi',
    recommended: false,
  });

  // ── LIVE DEBUGGER - for code defects only ──
  if (problemType === 'CODE_DEFECT' || problemType === 'DEPENDENCY') {
    options.push({
      id: 'live-debugger',
      icon: 'Lightning',
      label: 'Dynatrace Live Debugger',
      tier: 'semi',
      time: '~5 min to insight',
      desc: 'Captures a non-breaking snapshot at the exact failing line in production. No redeployment or code change required.',
      confidence: 82,
      actionLabel: 'Activate Live Debugger',
      actionClass: 'act-ld',
      isLiveDebugger: true,
      recommended: true,
    });
  } else {
    unavailable.push({ icon: 'Lightning', label: 'Live Debugger', reason: 'Not a code-level issue - no production snapshot needed' });
  }

  // ── CLOUD AGENTS - resource/config issues only ──
  const isAutomatable = (problemType === 'RESOURCE' || problemType === 'CONFIG');

  if (infra.cloud === 'aws') {
    if (isAutomatable) {
      options.push({
        id: 'aws-agent',
        icon: '🟠',
        label: 'AWS DevOps Agent',
        tier: 'auto',
        time: '~2–5 min',
        desc: 'Dynatrace triggers AWS DevOps Agent via EventBridge -> Systems Manager. Executes remediation runbook in ' + (infra.region || 'your AWS region') + ' autonomously.',
        confidence: p.hasRCA ? 85 : 45,
        actionLabel: 'Trigger AWS DevOps Agent',
        actionClass: 'act-auto',
        recommended: isAutomatable && p.hasRCA,
      });
    } else {
      unavailable.push({ icon: '🟠', label: 'AWS DevOps Agent', reason: problemType === 'CODE_DEFECT' ? 'Code defect - agent cannot fix source code' : 'Root cause unknown - unsafe to automate without RCA' });
    }
    unavailable.push({ icon: '🔵', label: 'Azure Automation', reason: 'Infrastructure is AWS, not Azure' });
    unavailable.push({ icon: '🔵', label: 'GCP Workflows', reason: 'Infrastructure is AWS, not GCP' });
  } else if (infra.cloud === 'azure') {
    if (isAutomatable) {
      options.push({
        id: 'azure-auto',
        icon: '🔵',
        label: 'Azure Automation Runbooks',
        tier: 'auto',
        time: '~3–8 min',
        desc: 'Dynatrace problem triggers Azure Automation via webhook. Runbook executes in your Azure subscription - scale, restart, or reconfigure resources.',
        confidence: p.hasRCA ? 80 : 40,
        actionLabel: 'Trigger Azure Automation',
        actionClass: 'act-auto',
        recommended: isAutomatable && p.hasRCA,
      });
    } else {
      unavailable.push({ icon: '🔵', label: 'Azure Automation', reason: problemType === 'CODE_DEFECT' ? 'Code defect - automation cannot fix source code' : 'Root cause unknown - unsafe to automate' });
    }
    unavailable.push({ icon: '🟠', label: 'AWS DevOps Agent', reason: 'Infrastructure is Azure, not AWS' });
    unavailable.push({ icon: '🔵', label: 'GCP Workflows', reason: 'Infrastructure is Azure, not GCP' });
  } else if (infra.cloud === 'gcp') {
    if (isAutomatable) {
      options.push({
        id: 'gcp-workflows',
        icon: '🔵',
        label: 'GCP Cloud Workflows',
        tier: 'auto',
        time: '~3–6 min',
        desc: 'Dynatrace triggers GCP Cloud Workflows via Pub/Sub. Executes remediation steps - scale Cloud Run, restart GKE pods, update config - in your GCP project.',
        confidence: p.hasRCA ? 78 : 38,
        actionLabel: 'Trigger GCP Workflow',
        actionClass: 'act-auto',
        recommended: isAutomatable && p.hasRCA,
      });
    } else {
      unavailable.push({ icon: '🔵', label: 'GCP Cloud Workflows', reason: problemType === 'CODE_DEFECT' ? 'Code defect - workflow cannot fix source code' : 'Root cause unknown - unsafe to automate' });
    }
    unavailable.push({ icon: '🟠', label: 'AWS DevOps Agent', reason: 'Infrastructure is GCP, not AWS' });
    unavailable.push({ icon: '🔵', label: 'Azure Automation', reason: 'Infrastructure is GCP, not Azure' });
  } else {
    // Linux / on-prem / unknown cloud
    if (isAutomatable) {
      options.push({
        id: 'ansible',
        icon: 'Tool',
        label: 'Ansible / AWX Runbook',
        tier: 'semi',
        time: '~15–30 min',
        desc: 'No cloud agent available for this host. Dynatrace Workflows can trigger an Ansible playbook via AWX/Tower webhook to execute remediation on the Linux host.',
        confidence: 60,
        actionLabel: 'Trigger Ansible Playbook',
        actionClass: 'act-semi',
        recommended: isAutomatable,
      });
    }
    unavailable.push({ icon: '🟠', label: 'AWS DevOps Agent', reason: 'Host is not running on AWS infrastructure' });
    unavailable.push({ icon: '🔵', label: 'Azure Automation', reason: 'Host is not running on Azure infrastructure' });
    unavailable.push({ icon: '🔵', label: 'GCP Cloud Workflows', reason: 'Host is not running on GCP infrastructure' });
  }

  // ── KUBERNETES - any cloud ──
  if (infra.isK8s && isAutomatable) {
    options.push({
      id: 'kubectl',
      icon: '☸',
      label: 'Kubernetes Auto-Remediation',
      tier: 'semi',
      time: '~5–10 min',
      desc: 'Dynatrace Workflows execute kubectl commands - scale deployment, restart pods, update ConfigMap - via a connected Kubernetes operator.',
      confidence: 70,
      actionLabel: 'Configure K8s Remediation',
      actionClass: 'act-semi',
      recommended: false,
    });
  }

  // ── MANUAL - always last resort ──
  options.push({
    id: 'manual',
    icon: 'Ticket',
    label: 'Manual - Engineering Ticket',
    tier: 'manual',
    time: '~2–8 hrs',
    desc: problemType === 'UNKNOWN' || !p.hasRCA
      ? 'Root cause not identified yet. Investigate first - automation is not safe until the problem is understood.'
      : 'Engineer reviews, implements fix, deploys. Full control. Slowest path.',
    confidence: 100,
    actionLabel: 'Create Engineering Ticket',
    actionClass: 'act-manual',
    recommended: (problemType === 'UNKNOWN' || !p.hasRCA),
  });

  // Sort: recommended first, then by tier (auto > semi > manual)
  const tierOrder = { auto: 0, semi: 1, manual: 2 };
  options.sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return (tierOrder[a.tier] || 2) - (tierOrder[b.tier] || 2);
  });

  return { options, unavailable };
}

// ---- Maturity Stage ----
function getMaturityStage(options) {
  const hasAuto = options.some(o => o.tier === 'auto' && o.recommended);
  const hasSemi = options.some(o => o.tier === 'semi');
  const hasRCA  = remProblem?.hasRCA;
  if (hasAuto && hasRCA) return 3;
  if (hasSemi && hasRCA) return 2;
  if (hasRCA) return 1;
  return 0;
}

// ---- Render ----
function showRemPanel(pid) {
  remProblem = PROBLEMS.find(p => p.id === pid);
  if (!remProblem) return;
  renderRemPanel();
  const drawer = document.getElementById('remPanel')?.closest('details');
  if (drawer) drawer.open = true;
  document.getElementById('remPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderRemPanel() {
  const el = document.getElementById('remBody');
  if (remediationState?.status && remediationState.status !== 'legacy') {
    renderPatternRemediationPanel();
    return;
  }
  if (!remProblem) {
    el.innerHTML = '<div class="rem-empty"><div class="rem-empty-icon">🛸</div><div style="font-size:12px;color:var(--text-3)">Select a problem to see remediation options</div></div>';
    return;
  }
  const p = remProblem;
  const infra = detectInfrastructure(p);
  const problemType = classifyProblem(p);
  const { options, unavailable } = resolveOptions(p, infra, problemType);
  const matStage = getMaturityStage(options);
  const matLabels = ['Observe', 'Recommend', 'Semi-Auto', 'Autonomous'];

  const TYPE_META = {
    RESOURCE:    { label: 'Resource / Scaling',  cls: 'resource',    auto: 'yes',     autoLabel: 'Automatable' },
    CONFIG:      { label: 'Configuration',        cls: 'config',      auto: 'yes',     autoLabel: 'Automatable' },
    CODE_DEFECT: { label: 'Code Defect',          cls: 'code',        auto: 'no',      autoLabel: 'Not auto-fixable' },
    DEPENDENCY:  { label: 'External Dependency',  cls: 'dependency',  auto: 'partial', autoLabel: 'Partially automatable' },
    UNKNOWN:     { label: 'Unknown - needs RCA',  cls: 'unknown',     auto: 'no',      autoLabel: 'Unsafe to automate' },
  };
  const tm = TYPE_META[problemType] || TYPE_META.UNKNOWN;

  const optCardsHtml = options.map(opt => {
    const confColor = opt.confidence >= 75 ? 'var(--green)' : opt.confidence >= 50 ? 'var(--amber)' : 'var(--coral)';
    const tierLabel = opt.tier === 'auto' ? 'Autonomous' : opt.tier === 'semi' ? 'Semi-Auto' : 'Manual';
    const ldDetails = opt.isLiveDebugger ? `
      <div class="ld-details">
        <div class="ld-details-title">What you get</div>
        <div class="ld-item"><span class="ld-dot"></span>Variable state at the exact failing line</div>
        <div class="ld-item"><span class="ld-dot"></span>Full call stack with local values</div>
        <div class="ld-item"><span class="ld-dot"></span>Request context - headers, payload shape</div>
        <div class="ld-item"><span class="ld-dot"></span>Reproducible snapshot - no reproduction needed</div>
        <div class="ld-item"><span class="ld-dot"></span>Zero code changes or redeployment required</div>
      </div>` : '';
    const actionFn = opt.id === 'aws-agent' || opt.id === 'azure-auto' || opt.id === 'gcp-workflows'
      ? `openAgentModal('${p.id}','${opt.id}')`
      : opt.id === 'live-debugger'
        ? `activateLiveDebugger('${p.id}')`
        : opt.id === 'dt-workflows'
          ? `openDTWorkflows('${p.id}')`
          : opt.id === 'manual'
            ? `openP('${p.id}')`
            : `alert('Triggering: ${opt.label}')`;
    return `
      <div class="rem-opt tier-${opt.tier} ${opt.recommended ? 'recommended' : ''}">
        <div class="rem-opt-header">
          <span class="rem-opt-icon">${opt.icon}</span>
          <span class="rem-opt-label">${opt.label}</span>
          <span class="tier-badge ${opt.tier}">${tierLabel}</span>
          <span class="rem-opt-time">⏱ ${opt.time}</span>
        </div>
        <div class="rem-opt-desc">${opt.desc}</div>
        ${ldDetails}
        <div class="rem-conf">
          <span class="rem-conf-lbl">Confidence</span>
          <div class="rem-conf-track"><div class="rem-conf-fill" style="width:${opt.confidence}%;background:${confColor}"></div></div>
          <span class="rem-conf-pct" style="color:${confColor}">${opt.confidence}%</span>
        </div>
        <button class="rem-action ${opt.actionClass}" data-action="remAction" data-pid="${p.id}" data-opt="${opt.id}">${opt.icon} ${opt.actionLabel}</button>
      </div>`;
  }).join('');

  const unavailHtml = unavailable.length ? `
    <div class="rem-unavail">
      <div class="rem-unavail-title">Not Available for This Problem</div>
      ${unavailable.map(u => `<div class="unavail-item"><span class="unavail-x">x</span><strong style="color:var(--text-2);margin-right:4px">${u.icon} ${u.label}</strong><span>- ${u.reason}</span></div>`).join('')}
    </div>` : '';

  const matSegsHtml = matLabels.map((_, i) => `<div class="mat-seg ${i <= matStage ? 'lit-' + i : ''}"></div>`).join('');

  el.innerHTML = `
    <div class="rem-context">
      <div class="rem-ctx-row">
        <span class="rem-ctx-label">Infrastructure</span>
        <span class="rem-ctx-val">
          <span class="infra-chip ${infra.chipClass}">${infra.icon} ${infra.label}</span>
          ${infra.isK8s ? '<span class="infra-chip k8s">☸ Kubernetes</span>' : ''}
        </span>
      </div>
      <div class="rem-ctx-row">
        <span class="rem-ctx-label">Problem Type</span>
        <span class="rem-ctx-val">
          <span class="type-chip ${tm.cls}">${tm.label}</span>
          <span class="auto-chip ${tm.auto}">${tm.autoLabel}</span>
        </span>
      </div>
      <div class="rem-ctx-row">
        <span class="rem-ctx-label">Root Cause</span>
        <span class="rem-ctx-val" style="font-size:12px;font-family:var(--mono);color:${p.hasRCA ? 'var(--text-1)' : 'var(--amber)'}">
          ${p.hasRCA ? p.rca : 'Warning Not identified - automation unsafe'}
        </span>
      </div>
    </div>
    <div class="rem-options">${optCardsHtml}</div>
    ${unavailHtml}
    <div class="maturity-bar">
      <div class="mat-title">Autonomous Operations Maturity</div>
      <div class="mat-track">${matSegsHtml}</div>
      <div class="mat-labels">${matLabels.map((l, i) => `<div class="mat-label ${i === matStage ? 'active' : ''}">${l}</div>`).join('')}</div>
    </div>`;
}

function findPatternById(patternId) {
  return detectPatterns(getFiltered()).patterns.find(p => p.id === patternId) || null;
}

function renderEvidenceSummary(evidence) {
  if (!evidence) return '';
  const rows = [
    ['Pattern', evidence.patternName],
    ['Problems', `${evidence.groupedProblemCount} grouped, ${evidence.openProblemCount} open`],
    ['Cost', `${fmtC(evidence.operationalCost)} exposure, ${fmtC(evidence.potentialSavings)} modeled savings`],
    ['Entities', (evidence.affectedServices || []).slice(0, 4).join(', ') || 'not available'],
    ['RCA', evidence.rootCauseSummary || 'not consistently identified'],
    ['MTTR', evidence.mttr ? fmtM(evidence.mttr) : 'not available'],
    ['Confidence', `${evidence.confidenceScore}/100, fixability ${evidence.fixabilityScore}/100`],
  ];
  return `<div class="rem-context">${rows.map(([k, v]) => `
    <div class="rem-ctx-row"><span class="rem-ctx-label">${k}</span><span class="rem-ctx-val">${v}</span></div>`).join('')}</div>`;
}

function renderAssistRemediationResponse(response, evidence=null) {
  if (!response) return '';
  if (typeof response === 'string') {
    try { return renderAssistRemediationResponse(extractJSON(response), evidence); }
    catch { return `<div class="rem-assist-text">${attrText(response)}</div>`; }
  }
  const renderValue = value => {
    if (value == null || value === '') return '';
    if (Array.isArray(value)) {
      return `<ul>${value.map(v => `<li>${renderInlineValue(v)}</li>`).join('')}</ul>`;
    }
    if (typeof value === 'object') {
      return `<div class="rem-kv-list">${Object.entries(value)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `<div class="rem-kv-row"><span>${humanizeKey(k)}</span><strong>${renderInlineValue(v)}</strong></div>`)
        .join('')}</div>`;
    }
    return `<div>${attrText(value)}</div>`;
  };
  const renderInlineValue = value => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(renderInlineValue).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${humanizeKey(k)}: ${renderInlineValue(v)}`)
        .join('; ');
    }
    return attrText(value);
  };
  const humanizeKey = key => String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, ch => ch.toUpperCase());
  const recs = Array.isArray(response.recommendations) ? response.recommendations : [];
  const phaseRecs = recs.length ? recs : [
    response.immediateRemediation ? { priority:'IMMEDIATE', title:'Immediate remediation', description:response.immediateRemediation, estimatedImpact:response.expectedOperationalCostReduction } : null,
    response.shortTermRemediation ? { priority:'SHORT_TERM', title:'Short-term remediation', description:response.shortTermRemediation, estimatedImpact:response.expectedOperationalCostReduction } : null,
    response.strategicRemediation ? { priority:'STRATEGIC', title:'Strategic remediation', description:response.strategicRemediation, estimatedImpact:response.expectedOperationalCostReduction } : null,
  ].filter(Boolean);
  const priMeta = {
    IMMEDIATE: { tier:'immediate', label:'Immediate', time:'Now', cls:'act-auto', recommended:true },
    SHORT_TERM: { tier:'short', label:'Short term', time:'Days', cls:'act-semi', recommended:false },
    STRATEGIC: { tier:'strategic', label:'Strategic', time:'Weeks', cls:'act-manual', recommended:false },
  };
  const confText = String(response.confidenceLevel || response.confidence_level || 'MEDIUM').toUpperCase();
  const confPct = confText === 'HIGH' ? 85 : confText === 'MEDIUM' ? 60 : 35;
  const confColor = confPct >= 75 ? 'var(--green)' : confPct >= 50 ? 'var(--amber)' : 'var(--coral)';
  const recCards = phaseRecs.map((rec, idx) => {
    const pri = String(rec.priority || (idx === 0 ? 'IMMEDIATE' : idx === 1 ? 'SHORT_TERM' : 'STRATEGIC')).toUpperCase();
    const meta = priMeta[pri] || priMeta.STRATEGIC;
    const feature = rec.dynatraceFeature || rec.dynatrace_feature
      || (response.suggestedDynatraceCapabilities || response.suggested_dynatrace_capabilities || [])[idx];
    return `<div class="rem-opt tier-${meta.tier} ${meta.recommended ? 'recommended' : ''}">
      ${feature ? `<div class="rem-feature-top"><span>Dynatrace capability</span><strong>${renderInlineValue(feature)}</strong></div>` : ''}
      <div class="rem-opt-header">
        <span class="rem-opt-label">${attrText(rec.title || meta.label)}</span>
        <span class="tier-badge ${meta.tier}">${meta.label}</span>
        <span class="rem-opt-time">${meta.time}</span>
      </div>
      <div class="rem-conf">
        <span class="rem-conf-lbl">Confidence</span>
        <div class="rem-conf-track"><div class="rem-conf-fill" style="width:${confPct}%;background:${confColor}"></div></div>
        <span class="rem-conf-pct" style="color:${confColor}">${confText}</span>
      </div>
      <div class="ai-rec-footer">
        ${rec.estimatedImpact ? `<span class="ai-rec-impact">${renderInlineValue(rec.estimatedImpact)}</span>` : ''}
      </div>
    </div>`;
  }).join('');
  const disclosure = (title, value) => {
    if (!value || (Array.isArray(value) && !value.length)) return '';
    const count = Array.isArray(value) ? `${value.length} items` : 'View details';
    return `<details class="rem-disclosure"><summary><span><strong>${title}</strong><small>${count}</small></span><b>+</b></summary><div class="rem-disclosure-body">${renderValue(value)}</div></details>`;
  };
  const expectedReduction = response.expectedOperationalCostReduction || response.expected_operational_cost_reduction || (evidence?.potentialSavings ? fmtC(evidence.potentialSavings) : 'Not yet estimated');
  const effort = response.estimatedImplementationEffort || response.estimated_implementation_effort || 'Confirm with the accountable team';
  const recommendedNext = response.immediateRemediation || response.immediate_remediation || phaseRecs[0]?.title || response.recommendedRemediationPath || response.recommended_remediation_path || 'Validate the recommended path';
  const whyNow = response.recommendedRemediationPath || response.recommended_remediation_path || 'This path prioritizes the next action while evidence and ownership are available.';
  const whyRows = evidence ? [
    ['Recurrence', `${evidence.occurrenceCount || evidence.groupedProblemCount || 0} occurrences`],
    ['Cost impact', fmtC(evidence.operationalCost || 0)],
    ['Open incidents', evidence.openProblemCount || 0],
    ['RCA confidence', `${evidence.rcaConfidence ?? evidence.confidenceScore ?? 0}%`],
    ['Trend', evidence.trend || 'Not available'],
  ] : [];
  return `
    <div class="rem-exec-summary">
      <div class="rem-assist-title">Executive Remediation Summary</div>
      <h3>${attrText(evidence?.patternName || 'Selected pattern')}</h3>
      <div class="rem-exec-grid">
        <div><span>Expected cost reduction</span><strong>${renderInlineValue(expectedReduction)}</strong></div>
        <div><span>Confidence</span><strong>${confText}</strong></div>
        <div><span>Effort / horizon</span><strong>${renderInlineValue(effort)}</strong></div>
      </div>
      <div class="rem-next-step"><span>Recommended next step</span><strong>${renderInlineValue(recommendedNext)}</strong></div>
      <p>${renderInlineValue(whyNow)}</p>
    </div>
    ${recCards ? `<div class="rem-assist-sec"><div class="rem-assist-title">Recommended Remediation Path</div><div class="rem-options">${recCards}</div></div>` : ''}
    ${whyRows.length ? `<details class="rem-disclosure"><summary><span><strong>Why this remediation is suggested</strong><small>View decision factors</small></span><b>+</b></summary><div class="rem-disclosure-body"><div class="rem-why-grid">${whyRows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div></div></details>` : ''}
    ${disclosure('Supporting evidence', response.supportingEvidence || response.supporting_evidence_used)}
    ${disclosure('Missing evidence / next validation steps', response.missingEvidenceOrNextValidationSteps || response.missing_evidence_or_next_validation_steps)}
  `;
}

function buildExecutivePatternPrompt(request) {
  return `Brief a C-level executive. Plain English only - no pods, JVM, heap, GC, DQL, or low-level engineering terms. Focus on business impact, customer experience, revenue risk, and immediate, short-term, and strategic remediation.

CRITICAL: every sentence in "summary" and every item in "patterns" MUST cite at least one specific number from the data, such as cost, percentage, count, or duration. Do not write generic statements. Recommendations must be strategic and reference the estimated cost figure. Remediation should be strategic, immediate, and short term.

Use only this RemediationRequest evidence. If evidence is missing, say what validation is needed.

Respond ONLY with valid JSON matching this shape:
{
  "summary": "2-3 executive sentences; every sentence includes at least one specific number from the request",
  "patterns": ["Each item includes at least one specific number from the request"],
  "costNarrative": "Executive cost and revenue-risk narrative referencing the estimated cost figure",
  "recommendations": [
    {"priority":"IMMEDIATE|SHORT_TERM|STRATEGIC","title":"string","description":"strategic recommendation referencing the estimated cost figure","dynatraceFeature":"string","estimatedImpact":"string","owner":"string"}
  ],
  "recommendedRemediationPath": "string",
  "immediateRemediation": "string",
  "shortTermRemediation": "string",
  "strategicRemediation": "string",
  "whySuggested": "string",
  "supportingEvidence": ["string"],
  "suggestedDynatraceCapabilities": ["string"],
  "estimatedImplementationEffort": "string",
  "expectedOperationalCostReduction": "string",
  "missingEvidenceOrNextValidationSteps": ["string"],
  "confidenceLevel": "LOW|MEDIUM|HIGH"
}

RemediationRequest:
${JSON.stringify(request, null, 2)}`;
}

function buildDeveloperRemediationPrompt(request) {
  return `You are a software developer using Dynatrace.

Based on these Dynatrace problem IDs:
${(request.problemIds || []).join(', ')}

Event type:
${request.eventType || request.severity || 'UNKNOWN'}

Event name:
${request.eventName || request.patternName}

Affected services/entities:
${(request.affectedServices || request.affectedEntities || []).join(', ') || 'not available'}

Please recommend the best remediation path.

Focus on:
- the most likely technical fix
- what to validate before changing code/config
- what Dynatrace Observability feature helps
- what should be escalated if ownership or RCA is unclear

Return valid JSON only matching this schema:
{
  "recommendedNextAction": {
    "title": "",
    "reason": "",
    "confidence": "high|medium|low",
    "dynatraceCapability": ""
  },
  "technicalFixes": [],
  "validationSteps": [],
  "escalationNeeded": false,
  "escalationReason": ""
}`;
}

function buildSreRemediationPrompt(request) {
  return `You are a Site Reliability Engineer.

Recommend prevention and automation actions for the recurring operational pattern represented by these Dynatrace problem IDs:
${(request.problemIds || []).join(', ')}

Event type:
${request.eventType || request.severity || 'UNKNOWN'}

Affected services:
${(request.affectedServices || request.affectedEntities || []).join(', ') || 'not available'}

Pattern metadata:
${JSON.stringify({
  occurrenceCount: request.occurrenceCount,
  openProblemCount: request.openProblemCount,
  rcaConfidence: request.rcaConfidence,
  trend: request.trend,
  timeClustering: request.timeClustering,
  deploymentCorrelation: request.deploymentCorrelation,
}, null, 2)}

Focus on:
- why this keeps recurring
- what should be automated
- what operational weakness should be corrected
- how to prevent future recurrence

Do not focus on code-level fixes.
Do not summarize individual incidents.

Return valid JSON only matching this schema:
{
  "recommendedNextAction": {
    "title": "",
    "reason": "",
    "confidence": "high|medium|low",
    "dynatraceCapability": ""
  },
  "automationActions": [],
  "preventionActions": [],
  "validationSteps": [],
  "missingEvidence": []
}`;
}

function buildPatternAssistPrompt(request) {
  if (persona === 'developer') return buildDeveloperRemediationPrompt(request);
  if (persona === 'sre') return buildSreRemediationPrompt(request);
  return buildExecutivePatternPrompt(request);
}

function normalizeActionList(items, priority, owner, capabilityFallback) {
  if (!Array.isArray(items)) return [];
  return items.filter(Boolean).map((item, idx) => {
    if (typeof item === 'string') {
      return {
        priority,
        title: item,
        description: item,
        dynatraceFeature: capabilityFallback,
        estimatedImpact: 'Validate and reduce recurrence for the selected pattern',
        owner,
      };
    }
    return {
      priority: item.priority || priority,
      title: item.title || item.action || `Recommended action ${idx + 1}`,
      description: item.description || item.reason || item.action || 'Validate this action against the selected problem evidence.',
      dynatraceFeature: item.dynatraceFeature || item.dynatraceCapability || capabilityFallback,
      estimatedImpact: item.estimatedImpact || item.expectedBenefit || 'Reduce recurrence and improve resolution confidence',
      owner: item.owner || owner,
    };
  });
}

function personaRemediationRecommendations(response, request) {
  if (!response || typeof response !== 'object') return [];
  const owner = persona === 'developer' ? (request.ownerTeam || 'Service owner') : persona === 'sre' ? 'SRE team' : (request.ownerTeam || 'Operations leadership');
  const defaultCapability = persona === 'developer' ? 'Application Observability' : persona === 'sre' ? 'Workflows' : 'Davis AI';
  const next = response.recommendedNextAction;
  const recommendations = [];
  if (next && typeof next === 'object') {
    recommendations.push({
      priority: 'IMMEDIATE',
      title: next.title || 'Recommended next action',
      description: next.reason || 'Use the selected pattern evidence to validate the next action.',
      dynatraceFeature: next.dynatraceCapability || defaultCapability,
      estimatedImpact: response.expectedOutcome || `Reduce recurrence across ${request.occurrenceCount} occurrences`,
      owner,
    });
  }
  recommendations.push(...normalizeActionList(response.technicalFixes, 'SHORT_TERM', owner, defaultCapability));
  recommendations.push(...normalizeActionList(response.automationActions, 'SHORT_TERM', owner, 'Workflows'));
  recommendations.push(...normalizeActionList(response.preventionActions, 'STRATEGIC', owner, 'Site Reliability Guardian'));
  return recommendations;
}

function normalizePatternAssistResponse(response, request) {
  const fallbackCost = fmtC(request?.operationalCost || 0);
  if (!response || typeof response === 'string') {
    return {
      summary: response || `${request.patternName} has ${request.occurrenceCount} occurrences and ${fallbackCost} estimated cost exposure.`,
      patterns: [`${request.patternName} appears ${request.occurrenceCount} times with ${fallbackCost} estimated cost exposure.`],
      costNarrative: `${request.groupedProblemCount} grouped problems create ${fallbackCost} in recurring cost exposure.`,
      recommendations: [
        { priority:'IMMEDIATE', title:'Stabilize the highest-cost recurring issue', description:`Contain the pattern now because it represents ${fallbackCost} in estimated cost exposure.`, dynatraceFeature:'Dynatrace Assist', estimatedImpact:`Reduce exposure against ${fallbackCost}`, owner:request.ownerTeam || 'Operations leadership' },
      ],
      generatedBy:'davis-copilot',
      latencyMs:0,
    };
  }
  const personaRecommendations = personaRemediationRecommendations(response, request);
  const missingEvidence = response.missingEvidenceOrNextValidationSteps || response.missingEvidence || response.validationSteps || [];
  const next = response.recommendedNextAction || {};
  return {
    summary: response.summary || `${request.patternName} has ${request.occurrenceCount} occurrences and ${fallbackCost} estimated cost exposure.`,
    patterns: Array.isArray(response.patterns) && response.patterns.length ? response.patterns : [`${request.patternName} appears ${request.occurrenceCount} times with ${fallbackCost} estimated cost exposure.`],
    costNarrative: response.costNarrative || response.expectedOperationalCostReduction || response.expectedOutcome || `${request.groupedProblemCount} grouped problems create ${fallbackCost} in recurring cost exposure.`,
    recommendations: Array.isArray(response.recommendations) && response.recommendations.length ? response.recommendations : personaRecommendations.length ? personaRecommendations : [
      { priority:'IMMEDIATE', title:'Stabilize the recurring issue', description:`Prioritize this pattern because it represents ${fallbackCost} in estimated cost exposure.`, dynatraceFeature:'Dynatrace Assist', estimatedImpact:`Reduce exposure against ${fallbackCost}`, owner:request.ownerTeam || 'Operations leadership' },
      { priority:'SHORT_TERM', title:'Assign an accountable owner', description:`Assign ownership for ${request.occurrenceCount} recurring occurrences and track reduction against ${fallbackCost}.`, dynatraceFeature:'Ownership and Routing', estimatedImpact:`Lower recurrence from ${request.occurrenceCount} occurrences`, owner:request.ownerTeam || 'Service owner' },
      { priority:'STRATEGIC', title:'Fund recurrence prevention', description:`Create a prevention plan for the ${fallbackCost} recurring cost exposure before it becomes repeat revenue risk.`, dynatraceFeature:'Business Analytics', estimatedImpact:`Reduce modeled exposure of ${fallbackCost}`, owner:'Executive sponsor' },
    ],
    recommendedRemediationPath: response.recommendedRemediationPath || next.title || response.expectedOutcome || 'Validate the recommended action against the selected pattern evidence.',
    immediateRemediation: response.immediateRemediation || next.title || null,
    whySuggested: response.whySuggested || next.reason || null,
    supportingEvidence: response.supportingEvidence || response.recurrenceDrivers || response.operationalWeaknesses || [],
    missingEvidenceOrNextValidationSteps: missingEvidence,
    confidenceLevel: response.confidenceLevel || String(next.confidence || response.confidence || 'MEDIUM').toUpperCase(),
    generatedBy:'davis-copilot',
    latencyMs:0,
  };
}

function renderPatternRemediationPanel() {
  const el = document.getElementById('remBody');
  if (!el) return;
  const state = remediationState || { status:'empty' };
  if (state.status === 'loading') {
    el.innerHTML = `
      <div class="rem-empty">
        <div class="ai-ring"></div>
        <div style="font-size:12px;color:var(--text-3)">Generating remediation path from Dynatrace Assist...</div>
      </div>
      ${renderEvidenceSummary(state.evidence)}`;
    return;
  }
  if (state.status === 'error') {
    el.innerHTML = `
      <div class="rem-empty">
        <div style="font-size:12px;color:var(--coral)">Unable to generate remediation path. Pattern evidence is still available.</div>
      </div>
      ${renderEvidenceSummary(state.evidence)}`;
    return;
  }
  if (state.status === 'done') {
    el.innerHTML = renderAssistRemediationResponse(state.response, state.evidence);
    return;
  }
  el.innerHTML = '<div class="rem-empty"><div style="font-size:12px;color:var(--text-3)">Select a pattern to request remediation guidance.</div></div>';
}

async function getPatternRemediation(patternId, opts={}) {
  const { openDrawers=true, scroll=true } = opts;
  const pat = findPatternById(patternId);
  if (!pat) {
    remediationState = { status:'empty', patternId:null, evidence:null, response:null, error:null };
    renderPatternRemediationPanel();
    return;
  }
  remediationPatternId = pat.id;
  const patterns = detectPatterns(getFiltered()).patterns;
  const { request, evidenceHash } = buildRemediationRequest(pat, patterns);
  const cacheKey = `${persona}:${pat.id}:${evidenceHash}`;
  const drawer = document.getElementById('remPanel')?.closest('details');
  if (openDrawers && drawer) drawer.open = true;
  if (openDrawers) openAnalysisDrawer();
  if (scroll) document.getElementById('remPanel')?.scrollIntoView({ behavior:'smooth', block:'nearest' });

  if (remediationCache.has(cacheKey)) {
    const cached = remediationCache.get(cacheKey);
    remediationState = { status:'done', patternId:pat.id, evidence:request, response:cached, error:null };
    lastAIResult = cached;
    aiState = 'result';
    renderPatternRemediationPanel();
    renderAIPanel(pat.problems || []);
    if (persona === 'executive') rerenderPatternsView();
    return;
  }

  remediationState = { status:'loading', patternId:pat.id, evidence:request, response:null, error:null };
  aiState = 'loading';
  renderPatternRemediationPanel();
  renderAIPanel(pat.problems || []);
  try {
    const prompt = buildPatternAssistPrompt(request);
    window.__OPINT_LAST_REMEDIATION_PROMPT__ = prompt;
    window.__OPINT_LAST_REMEDIATION_REQUEST__ = request;
    console.log('[OpInt Davis] full remediation prompt:', prompt);
    console.log('[OpInt Davis] remediation request:', request);
    const raw = await callDavisSkill(prompt);
    window.__OPINT_LAST_REMEDIATION_RESPONSE__ = raw;
    console.log('[OpInt Davis] raw remediation response:', raw);
    let parsed;
    try { parsed = extractJSON(raw); }
    catch { parsed = raw; }
    const normalized = normalizePatternAssistResponse(parsed, request);
    remediationCache.set(cacheKey, normalized);
    if (remediationPatternId !== pat.id) return;
    remediationState = { status:'done', patternId:pat.id, evidence:request, response:normalized, error:null };
    lastAIResult = normalized;
    aiState = 'result';
  } catch (err) {
    console.warn('[OpInt Davis] pattern remediation failed:', err.message || err);
    if (remediationPatternId !== pat.id) return;
    remediationState = { status:'error', patternId:pat.id, evidence:request, response:null, error:err };
    lastAIResult = normalizePatternAssistResponse(null, request);
    aiState = 'result';
  }
  renderPatternRemediationPanel();
  renderAIPanel(pat.problems || []);
  if (persona === 'executive') rerenderPatternsView();
}

// ---- Action Handlers ----
function activateLiveDebugger(pid) {
  const p = PROBLEMS.find(x => x.id === pid);
  if (!p) return;
  openAgentModal(pid, 'live-debugger');
}

function openDTWorkflows(pid) {
  openAgentModal(pid, 'dt-workflows');
}

function openAgentModal(pid, agentId) {
  awsModalProblem = PROBLEMS.find(p => p.id === pid);
  if (!awsModalProblem) return;
  const p = awsModalProblem;
  const infra = detectInfrastructure(p);
  const problemType = classifyProblem(p);

  const AGENT_CONFIGS = {
    'aws-agent': {
      title: '🟠 AWS DevOps Agent - Autonomous Remediation',
      steps: [
        { n: 1, title: 'Dynatrace OpInt', body: `Root cause identified: <strong>${p.rca || 'Unknown'}</strong><br><span style="color:var(--text-3);font-size:11px">Problem: ${p.title}</span>` },
        { n: 2, title: 'Davis CoPilot', body: `Generated remediation runbook for <strong>${infra.region || 'your region'}</strong><br><span style="color:var(--text-3);font-size:11px">Confidence: ${p.hasRCA ? '85%' : '45%'}</span>` },
        { n: 3, title: 'AWS DevOps Agent', body: `Executes via <strong>EventBridge -> Systems Manager</strong> in ${infra.region || 'ap-southeast-2'}<br><span style="color:var(--text-3);font-size:11px">No human approval required - confidence threshold met</span>` },
      ],
      runbook: getRunbook(p, 'aws'),
      confirmLabel: '🟠 Trigger Autonomous Remediation',
      confirmClass: 'background:linear-gradient(135deg,#ff9900,#e67e00);color:#000',
    },
    'azure-auto': {
      title: '🔵 Azure Automation - Autonomous Remediation',
      steps: [
        { n: 1, title: 'Dynatrace OpInt', body: `Root cause: <strong>${p.rca || 'Unknown'}</strong>` },
        { n: 2, title: 'Davis CoPilot', body: 'Generated Azure Automation runbook via webhook trigger' },
        { n: 3, title: 'Azure Automation', body: `Executes in your <strong>Azure subscription</strong> - scales, restarts, or reconfigures resources` },
      ],
      runbook: getRunbook(p, 'azure'),
      confirmLabel: '🔵 Trigger Azure Automation',
      confirmClass: 'background:linear-gradient(135deg,#0078d4,#005a9e);color:#fff',
    },
    'gcp-workflows': {
      title: '🔵 GCP Cloud Workflows - Autonomous Remediation',
      steps: [
        { n: 1, title: 'Dynatrace OpInt', body: `Root cause: <strong>${p.rca || 'Unknown'}</strong>` },
        { n: 2, title: 'Davis CoPilot', body: 'Generated GCP Workflow definition via Pub/Sub trigger' },
        { n: 3, title: 'GCP Cloud Workflows', body: `Executes in your <strong>GCP project</strong> - scales Cloud Run, restarts GKE pods` },
      ],
      runbook: getRunbook(p, 'gcp'),
      confirmLabel: '🔵 Trigger GCP Workflow',
      confirmClass: 'background:linear-gradient(135deg,#4285f4,#1a73e8);color:#fff',
    },
    'live-debugger': {
      title: 'Lightning Dynatrace Live Debugger',
      steps: [
        { n: 1, title: 'Dynatrace OpInt', body: `Code defect detected on <strong>${p.svcs?.[0] || 'service'}</strong><br><span style="color:var(--text-3);font-size:11px">Problem: ${p.title}</span>` },
        { n: 2, title: 'Live Debugger', body: 'Non-breaking snapshot placed at <strong>exact failing line</strong> in production - no redeployment required' },
        { n: 3, title: 'Developer', body: 'Reviews snapshot - <strong>variable state, call stack, request context</strong> - and implements targeted fix' },
      ],
      runbook: `# Live Debugger Snapshot Config
service: ${p.svcs?.[0] || 'target-service'}
trigger: exception | error-rate-spike
capture:
  - local_variables: true
  - call_stack: true
  - request_context: true
  - heap_snapshot: false  # non-breaking
max_snapshots: 5
ttl: 30m

# Dynatrace will notify via problem comment
# when snapshot is ready for developer review`,
      confirmLabel: 'Lightning Activate Live Debugger',
      confirmClass: 'background:linear-gradient(135deg,#9b8fe4,#7b6fd4);color:#fff',
    },
    'dt-workflows': {
      title: 'Lightning Dynatrace Workflows',
      steps: [
        { n: 1, title: 'Dynatrace OpInt', body: `Problem detected: <strong>${p.title}</strong>` },
        { n: 2, title: 'Dynatrace Workflows', body: 'Executes configured actions - notify, scale, restart, create ticket - natively within Dynatrace' },
        { n: 3, title: 'Outcome', body: 'Actions completed and logged in problem timeline. No external integration required.' },
      ],
      runbook: `# Dynatrace Workflow Config
trigger:
  type: problem
  filter: problemId == "${p.id}"

actions:
  - type: notification
    target: slack:#ops-incidents
    message: "Problem ${p.id} detected: ${p.title}"

  - type: http_request
    url: https://your-runbook-endpoint/execute
    method: POST
    body: { problemId: "${p.id}", action: "auto-remediate" }

  - type: create_jira_issue
    project: OPS
    summary: "${p.title}"`,
      confirmLabel: 'Lightning Configure Workflow',
      confirmClass: 'background:linear-gradient(135deg,#00d4b4,#00a896);color:#000',
    },
  };

  const cfg = AGENT_CONFIGS[agentId];
  if (!cfg) { alert('Triggering: ' + agentId); return; }

  document.getElementById('awsModalBody').innerHTML = `
    <div class="modal-sec">
      <div class="modal-sec-title">${cfg.title}</div>
      ${cfg.steps.map(s => `<div class="aws-step"><div class="aws-step-num">${s.n}</div><div class="aws-step-body"><strong>${s.title}</strong><br>${s.body}</div></div>`).join('')}
    </div>
    <div class="modal-sec">
      <div class="modal-sec-title">Generated Runbook / Config</div>
      <div class="aws-runbook">${cfg.runbook}</div>
    </div>
    <div class="aws-action">
      <button class="aws-cancel" data-action="closeAwsModal">Cancel</button>
      <button class="aws-confirm" style="${cfg.confirmClass}" data-action="triggerAgent" data-pid="${p.id}" data-agent="${agentId}">${cfg.confirmLabel}</button>
    </div>`;
  document.getElementById('awsModal').classList.remove('hidden');
}

function triggerAgent(pid, agentId) {
  const p = PROBLEMS.find(x => x.id === pid);
  const LABELS = { 'aws-agent': 'AWS DevOps Agent', 'azure-auto': 'Azure Automation', 'gcp-workflows': 'GCP Cloud Workflows', 'live-debugger': 'Live Debugger', 'dt-workflows': 'Dynatrace Workflows', 'ansible': 'Ansible Playbook' };
  const DETAILS = {
    'live-debugger': `Snapshot will appear in Dynatrace Live Debugger within ~2 minutes.<br><br>Developer notification sent to <strong>team:${(p?.tags||[]).find(t=>t.startsWith('team:'))||'engineering'}</strong>.<br>Snapshot expires in <strong>30 minutes</strong>.`,
    'dt-workflows': `Workflow executing - actions in progress. Check the Dynatrace Workflows dashboard for execution status and logs.`,
    default: `Runbook executing in <strong>${p?.region || 'your environment'}</strong>. Estimated completion: <strong>2–5 minutes</strong>.<br><br>Dynatrace will verify resolution and close this problem when metrics return to baseline.`,
  };
  const detail = DETAILS[agentId] || DETAILS.default;
  const execId = Math.random().toString(36).substring(2, 10).toUpperCase();
  document.getElementById('awsModalBody').innerHTML = `
    <div class="aws-sent">
      <div class="aws-sent-icon">${agentId === 'live-debugger' ? 'Lightning' : agentId === 'dt-workflows' ? 'Lightning' : '🟢'}</div>
      <div class="aws-sent-title">Dispatched to ${LABELS[agentId] || agentId}</div>
      <div class="aws-sent-sub">${detail}</div>
      <div style="margin-top:12px;padding:8px 14px;background:rgba(61,214,140,.06);border:1px solid rgba(61,214,140,.2);border-radius:var(--r);font-size:11px;color:var(--green);font-family:var(--mono)">
        Execution ID: opint-${execId}<br>
        Status: RUNNING ⟳<br>
        Problem: ${p?.id || pid}
      </div>
      <button class="aws-cancel" style="margin-top:8px;width:100%" data-action="closeAwsModal">Close</button>
    </div>`;
}

function getRunbook(p, platform) {
  const rcaRunbooks = {
    'checkout-service': {
      aws: `# Scale checkout-service\naws autoscaling set-desired-capacity \\\n  --auto-scaling-group-name checkout-asg \\\n  --desired-capacity 6 --region ${p.region||'ap-southeast-2'}`,
      azure: `# Scale Azure Container App\naz containerapp update \\\n  --name checkout-service \\\n  --min-replicas 3 --max-replicas 10`,
      gcp: `# Scale Cloud Run\ngcloud run services update checkout-service \\\n  --min-instances=3 --max-instances=10 \\\n  --region ${p.region||'asia-southeast1'}`,
    },
    'payment-gateway': {
      aws: `# Increase RDS connection limit\naws rds modify-db-parameter-group \\\n  --db-parameter-group-name payments-pg \\\n  --parameters "ParameterName=max_connections,ParameterValue=300"`,
      azure: `# Update Azure SQL connection\naz sql db update --name payments-db \\\n  --connection-policy Redirect`,
      gcp: `# Update Cloud SQL flags\ngcloud sql instances patch payments-db \\\n  --database-flags max_connections=300`,
    },
  };
  const runbook = rcaRunbooks[p.rca]?.[platform];
  if (runbook) return runbook;
  return `# Auto-generated remediation\n# Problem: ${p.id} - ${p.title}\n# Platform: ${platform}\n# Root cause: ${p.rca || 'unknown'}\n\n# Dynatrace generated runbook will appear here\n# based on Davis AI evidence and entity metadata`;
}


// ── AWS MODAL ──
function closeAwsModal(e){
  if(e&&e.target!==document.getElementById('awsModal'))return;
  document.getElementById('awsModal').classList.add('hidden');
}

// ── SELECTION ──
function toggleSel(id,checked,e){
  e.stopPropagation();
  if(checked&&selectedIds.size>=5){alert('Max 5 problems');return}
  if(checked)selectedIds.add(id);else selectedIds.delete(id);
  updateAnalyzeBtns();
  render();
}

function onRowClick(id){
  const p=PROBLEMS.find(x=>x.id===id);
  if(p) showRemPanel(id);
}

function updateAnalyzeBtns(){
  const n=selectedIds.size;
  document.getElementById('selCount').textContent=`${n} selected`;
  document.getElementById('analyzeBtnMulti').disabled=n===0;
}

function toggleExpand(id,e){
  e.stopPropagation();
  if(expandedIds.has(id))expandedIds.delete(id);else expandedIds.add(id);
  render();
}

// ── AI SOURCE ──
function switchAISrc(src){
  aiSrc=src;
  document.querySelectorAll('.ai-src-btn').forEach(b=>b.classList.toggle('active',b.dataset.src===src));
  document.getElementById('extCfg').classList.toggle('hidden',src!=='external');
}

function onProviderChange(){
  const p=document.getElementById('extProvider').value;
  const notes={
    anthropic:'Warning Problem data will be sent to Anthropic. Customer provides their own API key.',
    mcp:'Customer MCP Server - data sent to your configured endpoint. Full control over what is shared.',
    bedrock:'AWS Bedrock - data stays within your AWS account. No external transfer.',
    azure:'Azure OpenAI - data sent to your Azure tenant. Customer manages endpoint and key.',
  };
  document.getElementById('extNote').textContent=notes[p]||'';
  document.getElementById('extEndpointRow').style.display=p==='bedrock'?'none':'';
}

function openAnalysisDrawer() {
  if (persona === 'executive') return;
  const card = document.getElementById('aiCard');
  const drawer = card?.closest('details');
  if (drawer) drawer.open = true;
}

function extTriage(pid){
  const p=PROBLEMS.find(x=>x.id===pid);
  if(!p)return;
  switchAISrc('external');
  openAnalysisDrawer();
  document.getElementById('aiCard').scrollIntoView({behavior:'smooth',block:'nearest'});
  setTimeout(()=>{
    selectedIds.clear();selectedIds.add(pid);
    analyzeMulti();
  },300);
}

function deepAnalyze(pid){
  selectedIds.clear();selectedIds.add(pid);
  switchAISrc('davis');
  openAnalysisDrawer();
  analyzeMulti();
}

async function analyzePattern(patternId) {
  const pat = detectPatterns(getFiltered()).find(p => p.id === patternId);
  if (!pat) return;
  patternExplorerState.selectedId = pat.id;
  if (persona === 'executive') execPatternSelectionMade = true;
  selectedIds.clear();
  (pat.problems || []).forEach(p => selectedIds.add(p.id));
  switchAISrc('davis');
  await analyzeMulti();
  rerenderPatternsView();
}

// ── MULTI-PROBLEM AI ANALYSIS ──
async function analyzeMulti(){
  if(selectedIds.size===0)return;
  openAnalysisDrawer();
  const ps=getFiltered().filter(p=>selectedIds.has(p.id));
  if (!ps.length) {
    lastAIResult = {
      summary:'Pattern evidence is not available for this selection.',
      patterns:[],
      costNarrative:'',
      recommendations:[],
      generatedBy:'local',
      latencyMs:0,
    };
    aiState='result';
    renderAIPanel(ps);
    return;
  }
  aiState='loading';
  renderAIPanel(ps);
  try{
    const costs=ps.map(calcCost);
    const total=costs.reduce((a,c)=>a+c.total,0);
    const result=aiSrc==='external'?await callExternalAI(ps,persona,costs,total):await callDavisCopilot(ps,persona,costs,total);
    lastAIResult=result;aiState='result';
  }catch(e){
    console.warn('[OpInt Davis] analyzeMulti failed, using fallback:', e.message, e);
    lastAIResult=getFallbackMulti(ps,persona,ps.map(calcCost));aiState='result';
  }
  renderAIPanel(ps);
}

function renderAIPanel(ps){
  const el=document.getElementById('aiContent');
  if(aiState==='idle'){
    el.innerHTML=`<div class="ai-idle"><div style="font-size:12px;color:var(--text-3)">Expand a row for inline context or select problems for cross-problem analysis.</div><div class="ai-idle-hint">Pattern context | ranked actions</div></div>`;
    return;
  }
  if(aiState==='loading'){
    const steps=aiSrc==='external'?
      ['Connecting to external AI provider...','Preparing problem context...','Sending to '+getProviderLabel()+'...','Parsing AI response...','Structuring recommendations...']:
      ['Connecting to Davis CoPilot...','Fetching problem context...','Correlating entity signals...','Generating '+PMETA[persona].label+' analysis...','Structuring recommendations...'];
    el.innerHTML=`<div class="ai-loading"><div class="ai-ring"></div><div style="font-size:12px;color:var(--text-3)">Analysing with ${aiSrc==='external'?getProviderLabel():'Davis CoPilot'}...</div><div class="ai-steps">${steps.map((s,i)=>`<div class="ai-step ${i===0?'active':''}" id="ais-${i}"><span class="ai-step-ic">${i===0?'⟳':'○'}</span>${s}</div>`).join('')}</div></div>`;
    let step=0;
    const iv=setInterval(()=>{
      const prev=document.getElementById(`ais-${step}`);
      if(prev){prev.className='ai-step done';prev.querySelector('.ai-step-ic').textContent='ok';}
      step++;
      if(step<steps.length){const cur=document.getElementById(`ais-${step}`);if(cur){cur.className='ai-step active';cur.querySelector('.ai-step-ic').textContent='⟳';}}
      if(step>=steps.length)clearInterval(iv);
    },280);
    return;
  }
  // result
  const r=lastAIResult;
  const aiPatterns = ps ? detectPatterns(ps).patterns : [];
  const aiConfidence = aiPatterns.length
    ? confidenceLevel(arrMean(aiPatterns.map(p => patternConfidence(p))))
    : 'MEDIUM';
  el.innerHTML=`<div class="ai-result fade-in">
    <div class="ai-sec"><div class="ai-sec-lbl">📝 Summary - ${PMETA[persona].label} ${renderConfidenceBadge(aiConfidence, 'summary')}</div><div class="ai-summ">${r.summary}</div></div>
    <div class="ai-sec"><div class="ai-sec-lbl">🔍 Patterns</div>${r.patterns.map(p=>`<div class="ai-pat-item"><span class="ai-pat-bullet">◆</span><span>${p}</span></div>`).join('')}</div>
    ${r.costNarrative&&persona!=='developer'?`<div class="ai-sec"><div class="ai-sec-lbl">Cost Cost Narrative</div><div class="ai-cost-box">${r.costNarrative}</div></div>`:''}
    <div class="ai-sec"><div class="ai-sec-lbl">✅ Recommendations</div>${r.recommendations.map(rec=>`
      <div class="ai-rec">
        <div class="ai-rec-top"><span class="pri ${rec.priority}">${rec.priority.replace('_',' ')}</span><span class="ai-rec-title">${rec.title}</span></div>
        <div class="ai-rec-desc">${rec.description}</div>
        ${recommendationFeature(rec)?`<div class="ai-rec-feature">Dynatrace: ${recommendationFeature(rec)}</div>`:''}
        <div class="ai-rec-footer"><span class="ai-rec-impact">ok ${rec.estimatedImpact}</span><span class="ai-rec-owner">${rec.owner}</span></div>
      </div>`).join('')}</div>
    <div class="ai-meta"><div class="ai-meta-txt">${r.generatedBy==='davis-copilot'?'AI Davis CoPilot':r.generatedBy==='external'?`🔌 ${getProviderLabel()}`:'AI Demo mode'} | ${PMETA[persona].label} | ${ps?ps.length:selectedIds.size} problem${(ps?ps.length:selectedIds.size)!==1?'s':''}</div><div class="ai-meta-ms">${r.latencyMs}ms</div></div>
  </div>`;
}

function recommendationFeature(rec){
  if (rec?.dynatraceFeature) return rec.dynatraceFeature;
  const text = `${rec?.title || ''} ${rec?.description || ''}`.toLowerCase();
  if (text.includes('debug') || text.includes('code') || text.includes('exception') || text.includes('defect')) return 'Live Debugger';
  if (text.includes('aws')) return 'AWS DevOps Agent';
  if (text.includes('azure')) return 'Azure DevOps Agent';
  if (text.includes('gcp') || text.includes('google cloud')) return 'GCP DevOps Agent';
  if (text.includes('release') || text.includes('deploy') || text.includes('change')) return 'Release Management';
  if (text.includes('slo') || text.includes('reliability target')) return 'Service-Level Objectives';
  if (text.includes('customer') || text.includes('experience') || text.includes('journey')) return 'Digital Experience Monitoring';
  if (text.includes('revenue') || text.includes('business') || text.includes('cost')) return 'Business Analytics';
  if (text.includes('workflow') || text.includes('ticket') || text.includes('approval')) return 'Workflows';
  if (text.includes('runbook') || text.includes('automation') || text.includes('autonomous')) return 'AutomationEngine';
  if (text.includes('owner') || text.includes('routing') || text.includes('rca') || text.includes('root cause')) return 'Ownership and Routing';
  if (text.includes('cloud') || text.includes('kubernetes') || text.includes('capacity') || text.includes('infrastructure')) return 'Infrastructure and Cloud Observability';
  return 'Davis AI';
}

function getProviderLabel(){
  const p=document.getElementById('extProvider')?.value||'anthropic';
  return{anthropic:'Anthropic Claude',mcp:'MCP Server',bedrock:'AWS Bedrock',azure:'Azure OpenAI'}[p]||p;
}

// ── DAVIS COPILOT ──
// Stateless single call - text only in body, response.text is the answer
async function callDavisSkill(text) {
  console.log('[OpInt Davis] -> prompt:', text.slice(0, 200) + (text.length > 200 ? '...' : ''));
  const res = await fetch('/platform/davis/copilot/v1/skills/conversations:message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.warn('[OpInt Davis] HTTP error', res.status, errBody);
    throw new Error(`Davis CoPilot: ${res.status}`);
  }
  const data = await res.json();
  console.log('[OpInt Davis] ← raw response:', data);
  if (data.status === 'FAILED') throw new Error('Davis CoPilot: FAILED status');
  return data.text ?? '';
}

// Extract the first JSON object from a string that may contain surrounding text
function extractJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON object found in Davis response');
  return JSON.parse(m[0]);
}

// ── PATTERN INSIGHTS - two-level: bucket -> sub-bucket ──
const patternInsights = new Map();      // kept for legacy callers that may reference it
const subBucketInsights = new Map();    // keyed by subBucket.id

const TOOL_ICONS = {
  'aws-agent': '🟠', 'azure-auto': '🔵', 'gcp-workflows': '🔵',
  'live-debugger': 'Lightning', 'dt-workflows': 'Lightning', 'k8s-auto': '☸',
  'ansible': 'Tool', 'manual': 'Ticket',
};

// Group a pattern's problems into sub-buckets by {primaryEntity, rca}
function groupIntoSubBuckets(pat) {
  const map = new Map();
  pat.problems.forEach(p => {
    const entity = p.rca || p.svcs[0] || 'Unknown';
    const rca    = p.rca || null;
    const key    = entity + '||' + (rca || 'no-rca');
    if (!map.has(key)) {
      map.set(key, {
        id: pat.id + '::' + key,
        patId: pat.id,
        patTitle: pat.title,
        entityLabel: entity,
        rcaLabel: rca,
        problems: [],
      });
    }
    map.get(key).problems.push(p);
  });
  return [...map.values()].sort((a, b) => b.problems.length - a.problems.length);
}

function renderSubBucketContent(sbId) {
  const ins = subBucketInsights.get(sbId);
  if (!ins || ins.state === 'loading') {
    return `<div class="pc-ai-loading"><span class="pc-ai-spinner"></span>Davis is analyzing...</div>`;
  }
  if (ins.state === 'error') return `<div class="pc-ai-loading" style="color:var(--coral);font-style:normal">Analysis unavailable</div>`;

  const rp = ins.remediationPath;
  let remHtml = '';
  if (rp) {
    const row = (cls, label, tier) => {
      if (!tier) return '';
      const icon = TOOL_ICONS[tier.tool] || 'Tool';
      return `<div class="pc-ai-rem-row">
        <span class="pc-ai-rem-tier ${cls}">${label}</span>
        <span>${icon} <strong>${tier.label}</strong><span class="pc-ai-rem-time"> | ${tier.time}</span>
        ${tier.reason ? `<div class="pc-ai-rem-reason">${tier.reason}</div>` : ''}</span>
      </div>`;
    };
    remHtml = `<div class="pc-ai-rem">
      <div class="pc-ai-rem-label">Remediation Path</div>
      ${row('pc-ai-rem-now',  'Auto',   rp.auto)}
      ${row('pc-ai-rem-soon', 'Semi',   rp.semi)}
      ${row('pc-ai-rem-arch', 'Manual', rp.manual)}
    </div>`;
  }

  const confBadge = ins.confidence != null
    ? `<span class="sb-conf-badge ${confClass(ins.confidence)}">${confLabel(ins.confidence)}${Math.round(ins.confidence * 100)}% confidence</span>` : '';
  const featureHtml = ins.dynatraceFeature
    ? `<div class="pc-ai-rem-reason">Dynatrace: ${ins.dynatraceFeature}</div>` : '';
  return `<div class="pc-ai-summary-row">${confBadge}<div class="pc-ai-summary">${ins.summary || ''}</div>${featureHtml}</div>${remHtml}`;
}

const REMEDIATION_CATALOG = `Auto (fully autonomous):
  aws-agent | AWS DevOps Agent | ~2–5 min - AWS resource/config issues with known root cause
  azure-auto | Azure Automation Runbooks | ~3–8 min - Azure resource/config issues
  gcp-workflows | GCP Cloud Workflows | ~3–6 min - GCP resource/config issues
Semi-auto (human initiates, tool executes):
  live-debugger | Dynatrace Live Debugger | ~5 min - code defects, error rate spikes, exceptions
  dt-workflows | Dynatrace Workflows | ~10–20 min - any problem, triggers runbooks/notifications
  k8s-auto | Kubernetes Auto-Remediation | ~5–10 min - Kubernetes pod/deployment issues
  ansible | Ansible / AWX Runbook | ~15–30 min - on-premise or Linux hosts
Manual:
  manual | Manual Engineering Ticket | ~2–8 hrs - always valid as last resort`;

const DYNATRACE_OBSERVABILITY_FEATURES = `Broad Dynatrace features and action capabilities to recommend when relevant:
  Davis AI - problem analysis, impact explanation, root-cause guidance, and prioritization
  Live Debugger - capture code-level context for defects without redeploying
  AWS DevOps Agent - automate AWS remediation actions and cloud operations
  Azure DevOps Agent - automate Azure remediation actions and cloud operations
  GCP DevOps Agent - automate Google Cloud remediation actions and cloud operations
  Release Management - correlate incidents with deployments, releases, and change risk
  Workflows - orchestrate notifications, tickets, approvals, and runbooks
  AutomationEngine - standardize repeatable remediation and operational tasks
  Site Reliability Guardian - validate service health, release readiness, and reliability objectives
  Service-Level Objectives - manage reliability targets and error-budget risk
  Ownership and Routing - route recurring problems to accountable teams with context
  Digital Experience Monitoring - connect incidents to user journeys and customer experience
  Business Analytics - connect incidents to revenue, conversion, and business process impact
  Application Observability - improve reliability of customer-facing applications and services
  Infrastructure and Cloud Observability - manage host, Kubernetes, cloud, and capacity risk

Use these broad feature names only. Do not recommend granular telemetry sources such as Distributed Traces, Logs, Metrics, events, spans, stack traces, or dashboards as the feature.`;

async function fetchSubBucketInsight(sb) {
  subBucketInsights.set(sb.id, { state: 'loading' });
  const el = () => document.getElementById('sb-insight-' + CSS.escape(sb.id));
  try {
    const timeRange = document.getElementById('timeRange')?.value ?? '7d';
    const ctx = sb.problems.map(p => ({
      id: p.id, status: p.status, severity: p.sev,
      durationMinutes: p.dur, affectedUsers: p.users,
      cloud: p.cloud || null, category: p.category || null,
      hasRootCause: p.hasRCA,
    }));
    const sbAvgDur   = Math.round(arrMean(ctx.filter(c=>c.durationMinutes>0).map(c=>c.durationMinutes)));
    const sbTotalCost= Math.round(sb.problems.reduce((s,p)=>s+calcCost(p).total,0));
    const sbRcaPct   = Math.round(ctx.filter(c=>c.hasRootCause).length/ctx.length*100);
    const prompt = `You are analyzing a refined cluster of Dynatrace incidents. Respond ONLY with valid JSON, no markdown.

Problem type: "${sb.patTitle}"
Impacted entity: "${sb.entityLabel}"
Root cause entity: "${sb.rcaLabel || 'not yet identified'}"
${sb.problems.length} occurrence${sb.problems.length !== 1 ? 's' : ''} over the last ${timeRange}.
Cluster metrics: est. cost $${sbTotalCost}, avg duration ${sbAvgDur || '?'}min, ${sbRcaPct}% have root cause identified.
Occurrences: ${JSON.stringify(ctx)}

IMPORTANT: The summary MUST reference at least one specific metric (cost, count, duration, or RCA %) from the data above.

Recommend the best broad Dynatrace feature or action capability that would help address or prevent this cluster:
${DYNATRACE_OBSERVABILITY_FEATURES}

Choose the best remediation tool for each tier:
${REMEDIATION_CATALOG}

JSON format (pick exactly one tool per tier):
Include a top-level "dynatraceFeature" string containing one broad Dynatrace feature or action capability from the list above.
{"summary":"2 sentence summary referencing specific metrics (cost/duration/count)","remediationPath":{"auto":{"tool":"<id>","label":"<name>","reason":"one sentence why","time":"<estimate>"},"semi":{"tool":"<id>","label":"<name>","reason":"one sentence why","time":"<estimate>"},"manual":{"tool":"manual","label":"Manual Engineering Ticket","reason":"one sentence on investigation needed","time":"~2–8 hrs"}}}`;
    const raw = await callDavisSkill(prompt);
    console.log('[OpInt Davis] sub-bucket raw for', sb.entityLabel, ':', raw);
    const parsed = extractJSON(raw);
    console.log('[OpInt Davis] sub-bucket parsed:', parsed);
    const conf = subBucketConfidence(sb);
    subBucketInsights.set(sb.id, { state: 'done', confidence: conf, ...parsed });
  } catch(err) {
    console.warn('[OpInt Davis] sub-bucket error for', sb.entityLabel, err.message);
    subBucketInsights.set(sb.id, { state: 'error' });
  }
  const node = el();
  if (node) node.innerHTML = renderSubBucketContent(sb.id);
}

function schedulePatternInsights(patterns) {
  patterns.forEach(pat => {
    const subs = groupIntoSubBuckets(pat);
    subs.forEach(sb => { if (!subBucketInsights.has(sb.id)) fetchSubBucketInsight(sb); });
  });
}

// ── INLINE AI CALL ──
async function callInlineAI(p,persona){
  const cost=calcCost(p);
  const prompt=`Analyze this single Dynatrace problem for a ${persona}. Respond ONLY with JSON: {"summary":"2 sentence plain summary","topFix":"one sentence describing the single best immediate fix","dynatraceFeature":"one broad Dynatrace feature or action capability that helps address or prevent this problem"}

Problem: ${JSON.stringify({title:p.title,severity:p.sev,status:p.status,duration:p.dur,affectedUsers:p.users,hasRootCause:p.hasRCA,rootCause:p.rca,recurrenceScore:p.rec,estimatedCost:cost.total})}
Persona rules: ${persona==='executive'?'Plain English, no jargon, business focus':persona==='developer'?'Technical, code-level, specific service names':'Full technical with infrastructure context'}
Dynatrace feature rules:
${DYNATRACE_OBSERVABILITY_FEATURES}
The topFix may be operational or technical, but dynatraceFeature must be broad and must not be Distributed Traces, Logs, Metrics, events, spans, stack traces, or dashboards.`;
  const raw = await callDavisSkill(prompt);
  console.log('[OpInt Davis] callInlineAI raw:', raw);
  return extractJSON(raw);
}

function getFallbackInline(p,persona){
  const cost=calcCost(p);
  const SUMMARIES={
    executive:{
      'AVAILABILITY':`A critical platform outage affected ${(p.users||0).toLocaleString()} customers for ${fmtM(p.dur||30)}, causing an estimated ${fmtC(cost.total)} in losses. ${p.rec>=60?'This is a recurring issue - the root cause has not been permanently resolved.':'Immediate investigation is required to prevent recurrence.'}`,
      'ERROR':`Payment and transaction errors disrupted the experience of ${(p.users||0).toLocaleString()} customers. The estimated business impact is ${fmtC(cost.total)}${p.rec>=60?' - and this same incident has occurred multiple times recently.':'.'}`,
      'PERFORMANCE':`Customers experienced slow or degraded performance affecting ${(p.users||0).toLocaleString()} sessions, with an estimated ${fmtC(cost.total)} revenue impact. ${p.rec>=60?'This pattern repeats frequently, indicating an unresolved systemic issue.':''}`,
      'RESOURCE_CONTENTION':`A platform resource constraint was detected. ${p.users===0?'No direct customer impact was recorded.':'Approximately '+p.users.toLocaleString()+' customers were affected.'}`,
    },
    developer:{
      'AVAILABILITY':`Service ${p.rca||p.svcs[0]} went unavailable for ${fmtM(p.dur||30)}. ${p.hasRCA?`Root cause identified: ${p.rca}.`:'Root cause not documented - investigation required.'} ${p.rec>=60?'High recurrence score indicates a persistent failure mode.':''}`,
      'ERROR':`Error rate spiked on ${p.svcs.join(', ')}. ${p.hasRCA?`Root cause: ${p.rca} - likely connection pool or dependency failure.`:'No root cause entity identified. Check downstream dependencies and error logs.'} Recurrence score: ${p.rec}/100.`,
      'PERFORMANCE':`${p.rca||p.svcs[0]} response time degraded for ${fmtM(p.dur||30)}. ${p.rec>=60?'Deterministic pattern - correlates with peak traffic. Capacity or resource limit issue.':'Isolated incident - check recent deployments and resource utilisation.'}`,
      'RESOURCE_CONTENTION':`${p.rca||p.svcs[0]} hit resource limits (CPU/memory). Duration: ${fmtM(p.dur||30)}. ${p.noise?'Likely batch job interference - consider threshold tuning.':'Check for memory leaks, unbounded caches, or misconfigured resource limits.'}`,
    },
    sre:{
      'AVAILABILITY':`Availability incident on ${p.rca||p.svcs[0]} - ${fmtM(p.dur||30)} outage, ${(p.users||0).toLocaleString()} users affected, ${fmtC(cost.total)} estimated cost. ${p.rec>=60?'High recurrence - SLO error budget burning rapidly.':'Single occurrence - verify no SLO breach.'}`,
      'ERROR':`Error rate incident: ${p.svcs.join('/')} impacted for ${fmtM(p.dur||30)}. ${p.hasRCA?`Root cause: ${p.rca}.`:'RCA missing.'} ${p.noise?'Short duration suggests noise candidate - review alert threshold.':'Impact confirmed - initiate post-incident review.'}`,
      'PERFORMANCE':`Latency SLO violation on ${p.rca||p.svcs[0]} for ${fmtM(p.dur||30)}. ${p.rec>=60?'Recurring pattern at peak hours - HPA or capacity planning needed.':'Check recent deployment correlation and dependency health.'}`,
      'RESOURCE_CONTENTION':`Resource saturation on ${p.rca||p.svcs[0]}. ${p.noise?'Auto-resolved in <15min - likely noisy alert. Tune thresholds.':'Genuine saturation - check limits, eviction policies, and scaling config.'}`,
    },
  };
  const FIXES={
    executive:{AVAILABILITY:'Escalate to engineering leadership for immediate resolution and post-incident review.',ERROR:'Request engineering team to investigate payment system root cause and implement permanent fix.',PERFORMANCE:'Authorise capacity investment to prevent peak-hour degradation recurring.',RESOURCE_CONTENTION:'Assign engineering team to investigate and resolve the resource constraint.'},
    developer:{AVAILABILITY:`Restart ${p.rca||'the service'}, check health probes, review recent deployments. Add circuit breaker if downstream dependency.`,ERROR:`Check ${p.rca||'upstream service'} connection pool settings. Increase max_connections, add retry with backoff.`,PERFORMANCE:`Profile ${p.rca||p.svcs[0]} under load. Check HPA config - add custom metric scaling. Review GC settings if JVM.`,RESOURCE_CONTENTION:`Check resource limits in deployment YAML. Increase CPU/memory limits or add HPA. ${p.noise?'Exclude batch job window from alerting.':''}`},
    sre:{AVAILABILITY:`Trigger runbook: restart ${p.rca||'affected service'}, verify health checks, check PagerDuty escalation. Open post-incident review.`,ERROR:`Execute connection pool reset on ${p.rca||'service'}. Check CloudWatch/Dynatrace for anomaly correlation with deployments.`,PERFORMANCE:`Scale ${p.rca||p.svcs[0]} replicas immediately. Set HPA min: 3, max: 10 with request-rate metric.`,RESOURCE_CONTENTION:`${p.noise?'Tune alert threshold to 95%, exclude batch window.':'Increase resource limits, check OOM kill logs, review eviction policy.'}`},
  };
  return{summary:(SUMMARIES[persona]||SUMMARIES.sre)[p.sev]||`Problem ${p.id} recorded for ${fmtM(p.dur||30)}, affecting ${(p.users||0).toLocaleString()} users.`,topFix:(FIXES[persona]||FIXES.sre)[p.sev]||'Investigate root cause and document findings before closing.'};
}

// ── MULTI-PROBLEM AI (Davis CoPilot / External) ──
async function callDavisCopilot(ps,persona,costs,totalCost){
  return callAIWithPrompt(ps,persona,costs,totalCost,'davis-copilot');
}

async function callExternalAI(ps,persona,costs,totalCost){
  return callAIWithPrompt(ps,persona,costs,totalCost,'external');
}

function calculateAIMetrics(ps, costs, totalCost) {
  const { patterns } = detectPatterns(ps);
  const recurringCost = ps.reduce((s, p, i) => s + ((p.rec || 0) >= 60 ? (costs[i]?.total || 0) : 0), 0);
  const durations = ps.filter(p => p.status === 'RESOLVED' && p.dur > 0).map(p => p.dur);
  const avgMttr = durations.length ? Math.round(arrMean(durations)) : 0;
  const previousMttr = patterns.length
    ? Math.round(arrMean(patterns.map(p => p.trend === 'INCREASING' ? avgMttr * 0.82 : p.trend === 'DECREASING' ? avgMttr * 1.18 : avgMttr)))
    : avgMttr;
  const mttrDeltaPct = previousMttr ? Math.round((avgMttr - previousMttr) / previousMttr * 100) : 0;
  const techMap = new Map();
  ps.forEach((p, i) => {
    const infra = detectInfrastructure(p);
    const label = infra.cloud === 'aws' ? 'AWS' : infra.cloud === 'azure' ? 'Azure'
      : infra.cloud === 'gcp' ? 'GCP' : infra.isK8s ? 'Kubernetes' : 'On-premise';
    techMap.set(label, (techMap.get(label) || 0) + (costs[i]?.total || 0));
  });
  const topTech = [...techMap.entries()].sort((a,b)=>b[1]-a[1])[0] || ['N/A', 0];
  const resolvedPatterns = patterns.filter(p => p.problems.every(pr => pr.status === 'RESOLVED')).length;
  return {
    patternCount: patterns.length,
    recurringCostPct: totalCost ? Math.round(recurringCost / totalCost * 100) : 0,
    avgMttr,
    mttrDeltaPct,
    newPatterns: patterns.filter(p => (Date.now() - p.firstSeen) < 2*86400000).length,
    resolvedPatterns,
    topTech: topTech[0],
    topTechCostPct: totalCost ? Math.round(topTech[1] / totalCost * 100) : 0,
  };
}

function compactAssistContext(ps) {
  const problemIds = (ps || []).map(p => p.displayId || p.id).filter(Boolean);
  const eventTypes = uniqVals((ps || []).map(p => p.sev).filter(Boolean));
  const eventNames = uniqVals((ps || []).map(p => p.title).filter(Boolean)).slice(0, 5);
  const affected = uniqVals((ps || []).flatMap(p => [...(p.svcs || []), p.rca].filter(Boolean))).slice(0, 10);
  const starts = (ps || []).map(p => p.start).filter(Number.isFinite).sort((a, b) => a - b);
  const selectedScope = persona === 'developer' ? selectedDeveloperScope() : null;
  return {
    problemIds,
    eventType: eventTypes.join(', ') || 'UNKNOWN',
    eventName: eventNames.join(' | ') || 'Unknown problem',
    affectedServicesOrEntities: affected.join(', ') || 'not available',
    timeRange: starts.length ? `${new Date(starts[0]).toISOString()} to ${new Date(starts[starts.length - 1]).toISOString()}` : getTimeLabel(),
    selectedScope: selectedScope ? {
      type:selectedScope.type,
      label:selectedScope.label,
      source:selectedScope.source,
      rawValue:selectedScope.rawValue,
    } : null,
  };
}

function buildDeveloperAnalysisPrompt(ps) {
  const c = compactAssistContext(ps);
  return `You are a software developer using Dynatrace.

Please analyze these Dynatrace problem IDs:
${c.problemIds.join(', ')}

Event type:
${c.eventType}

Event name:
${c.eventName}

Affected services/entities:
${c.affectedServicesOrEntities}

Time range:
${c.timeRange}

Developer scope:
${c.selectedScope ? `${c.selectedScope.type}: ${c.selectedScope.label}` : 'All Developer Scope'}

Please explain:
- what the signals are suggesting
- what service, endpoint, or entity should be investigated first
- whether the pattern suggests recurrence, deployment correlation, or time clustering
- what recommendations you have
- which Dynatrace Observability capability would help most

Return valid JSON only matching this schema:
{
  "summary": "",
  "signals": [],
  "investigateFirst": {
    "target": "",
    "reason": "",
    "confidence": "high|medium|low"
  },
  "recommendations": [
    {
      "action": "",
      "dynatraceCapability": "",
      "reason": ""
    }
  ],
  "validationSteps": []
}`;
}

function buildSreAnalysisPrompt(ps, costs, totalCost) {
  const c = compactAssistContext(ps);
  const patterns = detectPatterns(ps).patterns;
  const metadata = {
    problemCount: ps.length,
    openProblems: ps.filter(p => p.status === 'OPEN').length,
    recurringPatterns: patterns.length,
    estimatedCost: totalCost,
    noisyAlerts: ps.filter(p => p.noise).length,
    missingRca: ps.filter(p => !p.hasRCA).length,
  };
  return `You are a Site Reliability Engineer.

Analyze the recurring operational pattern represented by the supplied Dynatrace problem IDs.

Focus on reliability engineering rather than incident debugging.

Problem IDs:
${c.problemIds.join(', ')}

Event type:
${c.eventType}

Affected services:
${c.affectedServicesOrEntities}

Pattern metadata:
${JSON.stringify(metadata, null, 2)}

Identify:
- recurring reliability signals
- recurrence drivers
- operational weaknesses
- automation opportunities
- prevention recommendations

Do not focus on code-level fixes.
Do not summarize individual incidents.
Prioritize recommendations that reduce future recurrence.

Return valid JSON only matching this schema:
{
  "reliabilitySignals": [
    {
      "signal": "string",
      "confidence": "high|medium|low",
      "evidence": ["string"]
    }
  ],
  "recurrenceDrivers": ["string"],
  "operationalWeaknesses": ["string"],
  "automationOpportunities": ["string"],
  "preventionRecommendations": ["string"],
  "confidence": "high|medium|low"
}`;
}

function normalizePersonaAnalysisResponse(parsed, currentPersona, ps, costs, totalCost, source, latencyMs) {
  if (currentPersona === 'developer') {
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    return {
      summary: parsed.summary || `Dynatrace Assist analyzed ${ps.length} selected problems.`,
      patterns: [
        ...(Array.isArray(parsed.signals) ? parsed.signals.map(s => typeof s === 'string' ? s : `${s.signal || 'Signal'}${s.confidence ? ` (${s.confidence})` : ''}`) : []),
        parsed.investigateFirst?.target ? `Investigate first: ${parsed.investigateFirst.target} - ${parsed.investigateFirst.reason || 'selected by Assist'}` : '',
      ].filter(Boolean),
      costNarrative: '',
      recommendations: recs.map((r, idx) => ({
        priority: idx === 0 ? 'IMMEDIATE' : 'SHORT_TERM',
        title: r.action || r.title || 'Investigate scoped evidence',
        description: r.reason || r.description || 'Use the selected problem IDs as the investigation scope.',
        dynatraceFeature: r.dynatraceCapability || r.dynatraceFeature || 'Davis AI',
        estimatedImpact: 'Faster scoped troubleshooting',
        owner: 'Service owner',
      })),
      validationSteps: parsed.validationSteps || [],
      generatedBy: source,
      latencyMs,
    };
  }
  if (currentPersona === 'sre') {
    const signals = Array.isArray(parsed.reliabilitySignals) ? parsed.reliabilitySignals : [];
    return {
      summary: `Reliability analysis for ${ps.length} selected problems identified ${signals.length} reliability signals and ${(parsed.automationOpportunities || []).length} automation opportunities.`,
      patterns: [
        ...signals.map(s => `${s.signal || 'Reliability signal'}${s.confidence ? ` (${s.confidence})` : ''}`),
        ...(parsed.recurrenceDrivers || []),
      ],
      costNarrative: totalCost ? `Selected problems represent ${fmtC(totalCost)} estimated operational exposure.` : '',
      recommendations: (parsed.preventionRecommendations || []).map((r, idx) => ({
        priority: idx === 0 ? 'IMMEDIATE' : idx === 1 ? 'SHORT_TERM' : 'STRATEGIC',
        title: r,
        description: (parsed.automationOpportunities || [])[idx] || 'Reduce recurrence through reliability workflow improvements.',
        dynatraceFeature: 'Site Reliability Guardian',
        estimatedImpact: 'Reduced future recurrence',
        owner: 'SRE team',
      })),
      reliabilitySignals: signals,
      operationalWeaknesses: parsed.operationalWeaknesses || [],
      automationOpportunities: parsed.automationOpportunities || [],
      generatedBy: source,
      latencyMs,
    };
  }
  return {...parsed, generatedBy:source, latencyMs};
}

async function callAIWithPrompt(ps,persona,costs,totalCost,source){
  if (!ps || !ps.length) throw new Error('Select a pattern before generating Dynatrace Assist output.');
  const t0=Date.now();
  const PINSTR={
    executive:`Brief a C-level executive. Plain English only - no pods, JVM, heap, GC, DQL. Focus on business impact, customer experience, revenue risk. CRITICAL: every sentence in "summary" and every item in "patterns" MUST cite at least one specific number (cost, %, count, or duration) from the data. Do not write generic statements. Recommendations must be strategic and reference the estimated cost figure.`,
    developer:`Brief a software developer. Technical root cause analysis. Name services, error types, config values. Recommend specific code-level or config-level fixes. Each recommendation must also name one broad Dynatrace feature or action capability that supports diagnosis, prevention, or ownership.`,
    sre:`Brief an SRE. Full operational analysis. Include infrastructure signals, alert noise assessment, SLO impact, runbook steps, blast radius. Each recommendation must also name one broad Dynatrace feature or action capability that supports reliability operations.`,
  };
  PINSTR.executive = `Brief a C-level executive. Plain English only - no pods, JVM, heap, GC, DQL, or low-level engineering terms. Focus on business impact, customer experience, revenue risk, and immediate, short-term, and strategic remediation. CRITICAL: every sentence in "summary" and every item in "patterns" MUST cite at least one specific number (cost, %, count, or duration) from the data. Do not write generic statements. Recommendations must be strategic and reference the estimated cost figure. Remediation should be immediate, short term, and strategic.`;
  const ctx=ps.map((p,i)=>({title:p.title,severity:p.sev,status:p.status,duration:p.dur,affectedUsers:p.users,hasRootCause:p.hasRCA,rootCause:p.rca,services:p.svcs,recurrenceScore:p.rec,estimatedCost:costs[i]?.total||0,cloud:p.cloud,region:p.region}));
  const rcaCount   = ps.filter(p=>p.hasRCA).length;
  const rcaPct     = ps.length ? Math.round(rcaCount/ps.length*100) : 0;
  const noiseCount = ps.filter(p=>p.noise).length;
  const openCount  = ps.filter(p=>p.status==='OPEN').length;
  const metrics = calculateAIMetrics(ps, costs, totalCost);
  const legacyPrompt=`${PINSTR[persona]}
TOTAL COST: $${totalCost.toLocaleString()}
KEY METRICS: ${rcaPct}% auto-correlated (${rcaCount}/${ps.length} problems have RCA), ${noiseCount} noise-suppressed events, ${openCount} currently open, ${metrics.patternCount} recurring patterns, ${metrics.recurringCostPct}% of cost from recurring issues, avg MTTR ${metrics.avgMttr} minutes, MTTR delta ${metrics.mttrDeltaPct}%, ${metrics.newPatterns} new patterns, ${metrics.resolvedPatterns} resolved patterns, ${metrics.topTech} accounts for ${metrics.topTechCostPct}% of operational cost.
PROBLEMS: ${JSON.stringify(ctx)}
BROAD DYNATRACE FEATURES AND ACTION CAPABILITIES:
${DYNATRACE_OBSERVABILITY_FEATURES}
IMPORTANT: Every insight in "summary" and "patterns" MUST reference at least one specific metric (cost %, count, duration, or percentage) from the data above. Do not make generic statements without metric backing.
Return ONLY JSON: {"summary":"string","patterns":["str","str","str"],"costNarrative":"string","recommendations":[{"priority":"IMMEDIATE|SHORT_TERM|STRATEGIC","title":"string","description":"string","dynatraceFeature":"one broad Dynatrace feature or action capability from the list","estimatedImpact":"string","owner":"string"}]}`;
  const prompt = persona === 'developer'
    ? buildDeveloperAnalysisPrompt(ps)
    : persona === 'sre'
      ? buildSreAnalysisPrompt(ps, costs, totalCost)
      : legacyPrompt;
  let text='';
  if(source==='davis-copilot'){
    text = await callDavisSkill(prompt);
  } else {
    const provider=document.getElementById('extProvider')?.value||'anthropic';
    const key=document.getElementById('extKey')?.value||'';
    if(provider==='anthropic'){
      if(!key)throw new Error('Enter your Anthropic API key in the field above');
      const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
      if(!res.ok)throw new Error('Anthropic API error: '+res.status);
      const data=await res.json();
      text=data.content?.map(c=>c.text||'').join('');
    } else if(provider==='mcp'){
      if(!key)throw new Error('Enter your MCP server URL in the field above');
      const res=await fetch(key,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:prompt}]})});
      if(!res.ok)throw new Error('MCP server error: '+res.status);
      const data=await res.json();
      text=data.content?.map(c=>c.text||'').join('')??data.message??'';
    } else {
      throw new Error(`Provider "${provider}" is not yet configured. Use Anthropic or MCP.`);
    }
  }
  console.log('[OpInt Davis] callAIWithPrompt raw text:', text);
  const parsed = extractJSON(text);
  console.log('[OpInt Davis] callAIWithPrompt parsed:', parsed);
  return normalizePersonaAnalysisResponse(parsed, persona, ps, costs, totalCost, source, Date.now()-t0);
}

function getFallbackMulti(ps,persona,costs){
  const total=costs.reduce((a,c)=>a+c.total,0);
  const users=ps.reduce((a,p)=>a+(p.users||0),0);
  const metrics = calculateAIMetrics(ps, costs, total);
  const rcaCount = ps.filter(p=>p.hasRCA).length;
  const rcaPct = ps.length ? Math.round(rcaCount/ps.length*100) : 0;
  return{
    summary:persona==='executive'?`${ps.length} customer-facing incidents affected ${users.toLocaleString()} customers with an estimated ${fmtC(total)} impact. ${metrics.patternCount} recurring patterns represent ${metrics.recurringCostPct}% of operational cost, so the investment case is tied to measurable repeat impact.`:persona==='developer'?`${ps.length} problems analyzed with ${rcaPct}% RCA coverage. Root cause clusters point to ${ps.filter(p=>p.hasRCA).map(p=>p.rca).filter(Boolean).join(', ')||'undocumented failures'}, while ${ps.filter(p=>!p.hasRCA).length} problems lack root cause and block prevention.`:`${ps.length} problems. ${ps.filter(p=>p.rec>=60).length} high-recurrence, ${ps.filter(p=>!p.hasRCA).length} missing RCA, estimated ${fmtC(total)} cost. Alert noise candidates: ${ps.filter(p=>p.noise).length}.`,
    patterns:[`${metrics.patternCount} recurring patterns account for ${metrics.recurringCostPct}% of operational cost`,`Average MTTR is ${metrics.avgMttr} minutes with a ${metrics.mttrDeltaPct}% modeled movement versus the prior period`,`${metrics.topTech} accounts for ${metrics.topTechCostPct}% of operational cost`],
    costNarrative:`These ${ps.length} incidents represent approximately ${fmtC(total)} in combined revenue and engineering costs, with ${metrics.recurringCostPct}% tied to recurring issues.`,
    recommendations:[
      {priority:'IMMEDIATE',title:'Address open incidents now',description:'Triage and escalate all OPEN status problems immediately. Follow existing runbooks.',dynatraceFeature:'Davis AI',estimatedImpact:'Stop active customer impact',owner:'on-call SRE'},
      {priority:'SHORT_TERM',title:'Mandate root cause documentation',description:'Require RCA entry before closing P1/P2 problems. Reduces recurrence by ~35%.',dynatraceFeature:'Ownership and Routing',estimatedImpact:'Reduce recurrence within 60 days',owner:'team:sre'},
      {priority:'STRATEGIC',title:'Invest in autonomous remediation',description:'Configure AWS DevOps Agent for top recurring patterns. Each automated fix saves ~2–4 hours of engineer time per occurrence.',estimatedImpact:`Save ${fmtC(total*0.4)} per period once automated`,owner:'team:platform'},
    ],
    generatedBy:'mock',latencyMs:1400,
  };
}


// ══════════════════════════════════════════
// PATTERN INTELLIGENCE ENGINE
// ══════════════════════════════════════════

// ── View switching ──
let currentView = 'explorer';

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-tab').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('view-patterns').style.display = view === 'patterns' ? '' : 'none';
  document.getElementById('view-explorer').style.display  = view === 'explorer'  ? '' : 'none';
  document.getElementById('view-progress').style.display  = view === 'progress'  ? '' : 'none';
  renderKPIs(getFiltered());
  renderTopPatternsSnapshot(getFiltered());
  if (view === 'patterns') renderPatternIntelligence();
  if (view === 'progress') { renderProgress(); requestAnimationFrame(() => drawTrendChart(WEEKLY_SNAPSHOTS)); }
}

function focusPatternExplorer() {
  if (persona === 'executive' && execAnalyticalView !== 'explorer') {
    execAnalyticalView = 'explorer';
    rerenderPatternsView();
  }
  setTimeout(() => {
  document.querySelector(persona === 'executive' ? '#patternExplorer' : '.pattern-explorer-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function toggleExecValueBreakdown() {
  execValueBreakdownOpen = !execValueBreakdownOpen;
  renderPatternIntelligence();
}

function toggleExecPatterns() {
  toggleExecKpiDetail('patterns');
}

function toggleExecKpiDetail(mode) {
  execKpiDetail = execKpiDetail === mode ? null : mode;
  execPatternsOpen = execKpiDetail === 'patterns' || execKpiDetail === 'impact';
  if (!execKpiDetail) expandedPatterns.clear();
  render();
}

function rerenderPatternsView() {
  if (currentView === 'patterns') renderPatternIntelligence();
  else render();
}

function selectPatternRow(id, opts={}) {
  patternExplorerState.selectedId = id;
  if (persona === 'executive') execPatternSelectionMade = true;
  renderTopPatternsSnapshot(getFiltered());
  rerenderPatternsView();
  if (opts.remediate !== false && persona !== 'executive') void getPatternRemediation(id, { openDrawers:true, scroll:false });
}

function setExecAnalyticalView(view) {
  execAnalyticalView = view === 'map' ? 'map' : 'explorer';
  rerenderPatternsView();
}

function selectExecMetric(metric) {
  execMetricDrilldown = execMetricDrilldown === metric ? null : metric;
  rerenderPatternsView();
}

function sortPatternTable(key) {
  if (patternExplorerState.sort === key) {
    patternExplorerState.dir = patternExplorerState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    patternExplorerState.sort = key;
    patternExplorerState.dir = key === 'name' || key === 'trend' ? 'asc' : 'desc';
  }
  patternExplorerState.offset = 0;
  rerenderPatternsView();
}

function setPatternFilter(key, value) {
  patternExplorerState.filters = { ...(patternExplorerState.filters || {}), [key]: value };
  if (!value) delete patternExplorerState.filters[key];
  patternExplorerState.offset = 0;
  rerenderPatternsView();
}

function setPatternSearch(value) {
  patternExplorerState.search = value || '';
  patternExplorerState.offset = 0;
  rerenderPatternsView();
}

function pagePatternTable(dir) {
  const patterns = detectPatterns(getFiltered()).patterns;
  const total = getExplorerRows(patterns).length;
  const pageSize = 160;
  patternExplorerState.offset = clamp((patternExplorerState.offset || 0) + dir * pageSize, 0, Math.max(0, total - pageSize));
  rerenderPatternsView();
}

// ── Pattern Detection ──
// Groups problems by normalised title plus the best available causal entity.
function detectPatterns(problems) {
  const groups = new Map();
  problems.forEach(p => {
    const key = patternSignature(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });

  const patterns = [];
  const oneOffs  = [];

  groups.forEach((ps, key) => {
    if (ps.length >= 2) {
      patterns.push(buildPattern(ps));
    } else {
      oneOffs.push(ps[0]);
    }
  });

  return {
    patterns: patterns.sort((a, b) => b.recurrenceScore - a.recurrenceScore),
    oneOffs,
  };
}

function normaliseTitle(title) {
  return title.toLowerCase()
    .replace(/\b(pod|node|host|instance|replica)[-_\s]+\S+/g, '$1-*')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
    .replace(/[\s]+/g, ' ').trim();
}

function normaliseEntityKey(entity) {
  return String(entity || 'unknown-entity').toLowerCase().replace(/\s+/g, ' ').trim();
}

function patternEntityKey(p) {
  if (p.rca) return `rca:${normaliseEntityKey(p.rca)}`;
  const primaryService = Array.isArray(p.svcs) ? p.svcs.find(Boolean) : null;
  return `entity:${normaliseEntityKey(primaryService)}`;
}

function isGenericMultiEntityTitle(title) {
  const t = normaliseTitle(title);
  return /\bmultiple\s+(services|entities|applications|problems)\b/.test(t)
    || /\bmultiple\s+services\s+problem\b/.test(t)
    || /\bimpacted\s+services\b/.test(t);
}

function patternSignature(p) {
  if (isGenericMultiEntityTitle(p.title)) return `${normaliseTitle(p.title)}|severity:${p.sev || 'unknown'}`;
  return `${normaliseTitle(p.title)}|${patternEntityKey(p)}`;
}

function uniqVals(values) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))].sort();
}

function topDimension(values, fallback='mixed') {
  return arrMode(values.map(v => String(v || '').trim()).filter(Boolean)) || fallback;
}

function purityFor(values) {
  const clean = values.map(v => String(v || '').trim()).filter(Boolean);
  if (!clean.length) return 0.5;
  const top = arrMode(clean);
  return clean.filter(v => v === top).length / clean.length;
}

function buildPatternDimensions(problems) {
  const rootCauseEntities = uniqVals(problems.filter(p => p.hasRCA && p.rca).map(p => p.rca));
  const impactedServices = uniqVals(problems.flatMap(p => Array.isArray(p.svcs) ? p.svcs : []));
  const managementZones = uniqVals(problems.flatMap(p => Array.isArray(p.mz) ? p.mz : []));
  const regions = uniqVals(problems.map(p => p.region));
  const clouds = uniqVals(problems.map(p => p.cloud).filter(c => c && c !== 'unknown'));
  const severities = uniqVals(problems.map(p => p.sev));
  const causalEntities = uniqVals(problems.map(patternEntityKey));
  const dimensionPurity = clamp(arrMean([
    purityFor(problems.map(patternEntityKey)),
    purityFor(problems.map(p => p.sev)),
    purityFor(problems.flatMap(p => Array.isArray(p.mz) ? p.mz : [])),
    purityFor(problems.map(p => p.region || p.cloud || 'unknown')),
  ]), 0, 1);

  return {
    rootCauseEntities,
    causalEntities,
    impactedServices,
    managementZones,
    regions,
    clouds,
    severities,
    primaryRootCause: topDimension(rootCauseEntities, null),
    primaryService: topDimension(impactedServices, null),
    primaryZone: topDimension(managementZones, null),
    primaryRegion: topDimension(regions, null),
    primaryCloud: topDimension(clouds, null),
    dimensionPurity,
  };
}

function renderPatternDimensionChips(pat) {
  const d = pat.dimensions || {};
  const chips = [];
  if (d.primaryRootCause) chips.push(`RCA: ${d.primaryRootCause}`);
  else if (d.primaryService) chips.push(`Entity: ${d.primaryService}`);
  if (d.primaryZone) chips.push(`Zone: ${d.primaryZone}${(d.managementZones?.length || 0) > 1 ? ` +${d.managementZones.length - 1}` : ''}`);
  if (d.primaryRegion) chips.push(`Region: ${d.primaryRegion}${(d.regions?.length || 0) > 1 ? ` +${d.regions.length - 1}` : ''}`);
  if ((d.impactedServices?.length || 0) > 1) chips.push(`${d.impactedServices.length} services`);
  if ((d.severities?.length || 0) > 1) chips.push(`${d.severities.length} severities`);
  return chips.slice(0, 5).map(c => `<span class="psh-pill dim-chip">${c}</span>`).join('');
}

function patternCost(pat) {
  return pat.totalCost ?? (pat.problems || []).reduce((s, p) => s + calcCost(p).total, 0);
}

function patternOpenCount(pat) {
  return (pat.problems || []).filter(p => p.status === 'OPEN').length;
}

function patternMaxImpact(pat) {
  return Math.max(0, ...(pat.problems || []).map(p => p.impact || 0));
}

function isHighImpactPattern(pat, allPatterns=[]) {
  const cost = patternCost(pat);
  const totalPatternCost = allPatterns.reduce((s, p) => s + patternCost(p), 0);
  const costShare = totalPatternCost ? cost / totalPatternCost : 0;
  return patternMaxImpact(pat) >= 75
    || cost >= 100000
    || costShare >= 0.25
    || patternOpenCount(pat) >= 5
    || (pat.occurrences >= 5 && (pat.problems || []).some(p => p.sev === 'AVAILABILITY'));
}

function highImpactReason(pat, allPatterns=[]) {
  const cost = patternCost(pat);
  const totalPatternCost = allPatterns.reduce((s, p) => s + patternCost(p), 0);
  const costShare = totalPatternCost ? cost / totalPatternCost : 0;
  if (patternMaxImpact(pat) >= 75) return 'Davis app/env impact';
  if (cost >= 100000) return 'material cost';
  if (costShare >= 0.25) return 'dominant cost driver';
  if (patternOpenCount(pat) >= 5) return 'many open occurrences';
  if (pat.occurrences >= 5 && (pat.problems || []).some(p => p.sev === 'AVAILABILITY')) return 'recurring availability risk';
  return '';
}

function patternPriorityScore(pat, allPatterns=[]) {
  const totalPatternCost = allPatterns.reduce((s, p) => s + patternCost(p), 0);
  const costShare = totalPatternCost ? patternCost(pat) / totalPatternCost : 0;
  const recurrence = clamp((pat.occurrences || 0) / 10, 0, 1);
  const impact = clamp(patternMaxImpact(pat) / 100, 0, 1);
  const open = clamp(patternOpenCount(pat) / 5, 0, 1);
  const fix = pat.fixability === 'HIGH' ? 1 : pat.fixability === 'MEDIUM' ? 0.65 : 0.35;
  return Math.round((costShare * 35 + recurrence * 25 + impact * 20 + open * 15 + fix * 5));
}

function patternFixabilityScore(pat) {
  const confidence = clamp(patternConfidenceScore(pat) / 100, 0, 1);
  const fix = pat.fixability === 'HIGH' ? 1 : pat.fixability === 'MEDIUM' ? 0.62 : 0.28;
  const rca = pat.rcaSummary && pat.rcaSummary !== 'RCA not identified' ? 0.18 : 0;
  return clamp((fix * 0.7) + (confidence * 0.3) + rca, 0.08, 1);
}

function patternRecoverableValue(pat) {
  return recoverableFromCost(patternCost(pat));
}

function attrText(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function actFirstModel(pat, patterns) {
  const totalCost = patterns.reduce((s, p) => s + patternCost(p), 0);
  const maxCost = Math.max(1, ...patterns.map(p => patternCost(p)));
  const cost = patternCost(pat);
  const recoverable = patternRecoverableValue(pat);
  const costShare = totalCost ? cost / totalCost : 0;
  const exposure = clamp((cost / maxCost) * 0.72 + costShare * 0.28, 0.08, 1);
  const fixability = patternFixabilityScore(pat);
  const highExposure = costShare >= 0.25 || cost >= 100000 || exposure >= 0.58;
  const readyToAct = fixability >= 0.6;
  const quadrant = highExposure && readyToAct
    ? 'Act first'
    : highExposure
      ? 'Escalate'
      : readyToAct
        ? 'Quick win'
        : 'Monitor';
  const reason = `${fmtC(cost)} exposure is ${Math.round(costShare * 100)}% of recurring pattern cost, with ${fmtC(recoverable)} modeled recoverable value and ${Math.round(fixability * 100)}% action readiness.`;
  return { cost, recoverable, costShare, exposure, fixability, quadrant, reason };
}

function patternTeams(pat) {
  return uniqVals((pat.problems || []).flatMap(p => (p.tags || [])
    .map(t => String(t))
    .filter(t => t.toLowerCase().startsWith('team:'))
    .map(t => t.split(':').slice(1).join(':'))));
}

function patternServices(pat) {
  return uniqVals((pat.problems || []).flatMap(p => Array.isArray(p.svcs) ? p.svcs : []));
}

function patternEnvironments(pat) {
  return uniqVals((pat.problems || []).flatMap(p => Array.isArray(p.mz) ? p.mz : []));
}

function patternConfidenceScore(pat) {
  return Math.round(pat.qualityScore || 0);
}

function simpleHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function primaryTeamFromPattern(pat) {
  return patternTeams(pat)[0] || null;
}

function patternAffectedEntities(pat) {
  return uniqVals((pat.problems || []).flatMap(p => [
    ...(Array.isArray(p.affectedEntityIds) ? p.affectedEntityIds : []),
    ...(Array.isArray(p.svcs) ? p.svcs : []),
    p.rca,
  ].filter(Boolean)));
}

function buildRemediationRequest(pat, allPatterns=[]) {
  const problems = pat.problems || [];
  const resolved = problems.filter(p => p.status === 'RESOLVED' && p.dur);
  const operationalCost = patternCost(pat);
  const services = patternServices(pat);
  const envs = patternEnvironments(pat);
  const tags = uniqVals(problems.flatMap(p => p.tags || []));
  const clouds = uniqVals(problems.map(p => p.cloud).filter(Boolean).filter(c => c !== 'unknown'));
  const users = problems.reduce((s, p) => s + (p.users || 0), 0);
  const rcaList = pat.dimensions?.rootCauseEntities || problems.map(p => p.rca).filter(Boolean);
  const scope = persona === 'developer' ? selectedDeveloperScope() : null;
  const req = {
    patternId: pat.id,
    patternName: pat.title,
    eventType: pat.severity || problems[0]?.sev || 'UNKNOWN',
    eventName: pat.title || problems[0]?.title || 'Unknown problem',
    problemIds: problems.map(p => p.displayId || p.id),
    occurrenceCount: pat.occurrences,
    openProblemCount: patternOpenCount(pat),
    groupedProblemCount: problems.length,
    operationalCost,
    potentialSavings: recoverableFromCost(operationalCost),
    affectedServices: services,
    affectedEntities: patternAffectedEntities(pat),
    environment: envs.join(', ') || 'unknown',
    cloudProvider: clouds[0] || null,
    rootCauseSummary: rcaList.length ? rcaList.join(', ') : null,
    rcaConfidence: Math.round((pat.rcaConsistency || 0) * 100),
    deploymentCorrelation: tags.some(t => /deploy|release|version|build/i.test(t)) ? 'deployment-related tags present' : 'not available from current evidence',
    changeCorrelation: tags.some(t => /change|deploy|release|version|build/i.test(t)) ? 'change-related tags present' : 'not available from current evidence',
    timeClustering: pat.hasTimeCluster ? `clusters around ${String(pat.dominantHour).padStart(2, '0')}:00 UTC` : 'no strong time cluster detected',
    mttr: resolved.length ? Math.round(arrMean(resolved.map(p => p.dur))) : null,
    userImpact: users,
    logsEvidenceSummary: 'not available in current pattern evidence package',
    tracesEvidenceSummary: 'not available in current pattern evidence package',
    metricsEvidenceSummary: `severity ${pat.severity}; max Davis impact ${patternMaxImpact(pat)}; recurrence score ${pat.recurrenceScore}`,
    relevantTags: tags,
    selectedScope: scope ? {
      type: scope.type,
      label: scope.label,
      source: scope.source,
      rawValue: scope.rawValue,
    } : null,
    ownerTeam: primaryTeamFromPattern(pat),
    confidenceScore: patternConfidenceScore(pat),
    fixabilityScore: Math.round((pat.fixabilityRaw || 0) * 100),
    trend: pat.trend,
    priorityScore: patternPriorityScore(pat, allPatterns),
  };
  return { request: req, evidenceHash: simpleHash(JSON.stringify(req)) };
}

function patternFilterOptions(patterns, getter) {
  return uniqVals(patterns.flatMap(getter));
}

function patternFilterMatch(pat, filters) {
  const cost = patternCost(pat);
  const confidence = patternConfidenceScore(pat);
  if (filters.cost === 'high' && cost < 100000) return false;
  if (filters.cost === 'medium' && (cost < 10000 || cost >= 100000)) return false;
  if (filters.cost === 'low' && cost >= 10000) return false;
  if (filters.recurrence === 'high' && pat.occurrences < 10) return false;
  if (filters.recurrence === 'medium' && (pat.occurrences < 4 || pat.occurrences >= 10)) return false;
  if (filters.recurrence === 'low' && pat.occurrences >= 4) return false;
  if (filters.confidence === 'high' && confidence < 75) return false;
  if (filters.confidence === 'medium' && (confidence < 50 || confidence >= 75)) return false;
  if (filters.confidence === 'low' && confidence >= 50) return false;
  if (filters.team && !patternTeams(pat).includes(filters.team)) return false;
  if (filters.service && !patternServices(pat).includes(filters.service)) return false;
  if (filters.environment && !patternEnvironments(pat).includes(filters.environment)) return false;
  return true;
}

function getExplorerRows(patterns) {
  const state = patternExplorerState;
  const q = (state.search || '').toLowerCase().trim();
  const rows = patterns
    .filter(pat => !q || [
      pat.title,
      ...(pat.dimensions?.rootCauseEntities || []),
      ...patternServices(pat),
      ...patternTeams(pat),
      ...patternEnvironments(pat),
    ].join(' ').toLowerCase().includes(q))
    .filter(pat => patternFilterMatch(pat, state.filters || {}))
    .map(pat => ({ pat, score: patternPriorityScore(pat, patterns) }));
  const val = row => {
    const pat = row.pat;
    switch (state.sort) {
      case 'name': return pat.title.toLowerCase();
      case 'occurrences': return pat.occurrences;
      case 'cost': return patternCost(pat);
      case 'open': return patternOpenCount(pat);
      case 'confidence': return patternConfidenceScore(pat);
      case 'fixability': return pat.fixability === 'HIGH' ? 3 : pat.fixability === 'MEDIUM' ? 2 : 1;
      case 'trend': return pat.trend;
      case 'priority':
      default: return row.score;
    }
  };
  rows.sort((a, b) => {
    const av = val(a), bv = val(b);
    const cmp = typeof av === 'string' ? String(av).localeCompare(String(bv)) : av - bv;
    return state.dir === 'asc' ? cmp : -cmp;
  });
  return rows;
}

function renderSelectOptions(values, selected, label) {
  return `<option value="">${label}</option>${values.map(v => `<option value="${v}" ${v===selected?'selected':''}>${v}</option>`).join('')}`;
}

/**
 * @typedef {Object} ToolDetectionRow
 * @property {string} Vendor
 * @property {string=} AgentName
 * @property {("Standalone"|"Container"|"CodeModule"|"JS"|"Mobile"|string)=} Type
 * @property {string[]|string=} Purpose
 * @property {string=} EntityName
 * @property {string=} id
 * @property {string=} HostName
 * @property {string=} HostId
 * @property {string=} ServiceName
 * @property {string=} ServiceId
 */

/**
 * @typedef {Object} DetectedTool
 * @property {string} vendor
 * @property {string[]} types
 * @property {string[]} purposes
 * @property {number} count
 * @property {string[]} affectedServices
 * @property {string[]} affectedEntities
 */

/**
 * @typedef {Object} InvestigationComplexity
 * @property {number} score
 * @property {number} rcaConfidence
 * @property {"low"|"medium"|"high"} evidenceFragmentation
 * @property {number} toolCount
 * @property {number} signalSourceCount
 * @property {DetectedTool[]} detectedTools
 * @property {string} narrative
 */

function normaliseMatchValue(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Accepts records returned by the attached row-producing DQL before its final
 * `summarize countDistinct(Vendor)` line.
 * @param {unknown[]} rows
 */
function setToolDetectionRowsFromDql(rows) {
  TOOL_DETECTION_ROWS = (Array.isArray(rows) ? rows : [])
    .filter(row => row && typeof row === 'object' && String(row.Vendor || '').trim())
    .map(row => ({
      Vendor: String(row.Vendor),
      AgentName: row.AgentName ? String(row.AgentName) : undefined,
      Type: row.Type ? String(row.Type) : undefined,
      Purpose: Array.isArray(row.Purpose) ? row.Purpose.map(String) : row.Purpose ? String(row.Purpose) : undefined,
      EntityName: row.EntityName ? String(row.EntityName) : undefined,
      id: row.id ? String(row.id) : undefined,
      HostName: row.HostName ? String(row.HostName) : undefined,
      HostId: row.HostId ? String(row.HostId) : undefined,
      ServiceName: row.ServiceName ? String(row.ServiceName) : undefined,
      ServiceId: row.ServiceId ? String(row.ServiceId) : undefined,
    }));
}

function applyToolDetectionDqlResult(result) {
  const rows = Array.isArray(result)
    ? result
    : result?.result?.records || result?.records || [];
  setToolDetectionRowsFromDql(rows);
  if (currentView === 'patterns') rerenderPatternsView();
}

function patternToolMatchDimensions(pattern) {
  const problems = pattern.problems || [];
  const impactedIds = new Set(problems.flatMap(p => p.affectedEntityIds || []).map(normaliseMatchValue).filter(Boolean));
  const serviceNames = new Set(patternServices(pattern).map(normaliseMatchValue).filter(Boolean));
  const entityNames = new Set([
    ...(pattern.dimensions?.rootCauseEntities || []),
    ...(pattern.dimensions?.impactedEntities || []),
    ...problems.map(p => p.rca),
    ...patternServices(pattern),
  ].map(normaliseMatchValue).filter(Boolean));
  return { impactedIds, serviceNames, entityNames };
}

/**
 * Matches tool rows to one selected pattern only. Matching precedence:
 * ServiceId, ServiceName, HostId, HostName, EntityName.
 * @param {Object} pattern
 * @param {ToolDetectionRow[]} rows
 * @returns {ToolDetectionRow[]}
 */
function matchToolDetectionRowsToPattern(pattern, rows) {
  const { impactedIds, serviceNames, entityNames } = patternToolMatchDimensions(pattern);
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const serviceId = normaliseMatchValue(row.ServiceId);
    if (serviceId) return impactedIds.has(serviceId);

    const serviceName = normaliseMatchValue(row.ServiceName);
    if (serviceName) return serviceNames.has(serviceName) || entityNames.has(serviceName);

    const hostId = normaliseMatchValue(row.HostId);
    if (hostId) return impactedIds.has(hostId);

    const hostName = normaliseMatchValue(row.HostName);
    if (hostName) return entityNames.has(hostName);

    const entityName = normaliseMatchValue(row.EntityName);
    return Boolean(entityName && entityNames.has(entityName));
  });
}

/**
 * @param {ToolDetectionRow[]} rows
 * @returns {DetectedTool[]}
 */
function mapDetectedToolsFromDqlRows(rows) {
  const byVendor = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const vendor = String(row?.Vendor || '').trim();
    if (!vendor) return;
    const key = vendor.toLowerCase();
    if (!byVendor.has(key)) {
      byVendor.set(key, {
        vendor,
        types: new Set(),
        purposes: new Set(),
        count: 0,
        affectedServices: new Set(),
        affectedEntities: new Set(),
      });
    }
    const tool = byVendor.get(key);
    tool.count += 1;
    if (row.Type) tool.types.add(String(row.Type));
    const purposes = Array.isArray(row.Purpose)
      ? row.Purpose
      : row.Purpose
        ? String(row.Purpose).split(',').map(p => p.trim()).filter(Boolean)
        : [];
    purposes.forEach(purpose => tool.purposes.add(String(purpose)));
    if (row.ServiceName) tool.affectedServices.add(String(row.ServiceName));
    [row.EntityName, row.HostName].filter(Boolean).forEach(entity => tool.affectedEntities.add(String(entity)));
  });
  return [...byVendor.values()].map(tool => ({
    vendor: tool.vendor,
    types: [...tool.types],
    purposes: [...tool.purposes],
    count: tool.count,
    affectedServices: [...tool.affectedServices],
    affectedEntities: [...tool.affectedEntities],
  }));
}

/**
 * @param {{pattern: Pattern, toolRows: ToolDetectionRow[]}} input
 * @returns {InvestigationComplexity}
 */
function buildInvestigationComplexity({ pattern, toolRows }) {
  const detectedTools = mapDetectedToolsFromDqlRows(toolRows);
  const rcaConfidence = Math.round((pattern.rcaConsistency || 0) * 100);
  const toolCount = detectedTools.length;
  const signalSourceCount = uniqVals(detectedTools.flatMap(tool => tool.purposes)).length;
  const fragmentedEvidence = toolCount > 1 && rcaConfidence < 70;
  const evidenceFragmentation = fragmentedEvidence
    ? toolCount > 2 ? 'high' : 'medium'
    : 'low';
  const score = Math.round(clamp(
    (100 - rcaConfidence) * 0.6
      + Math.min(25, Math.max(0, toolCount - 1) * 12)
      + Math.min(15, Math.max(0, signalSourceCount - 1) * 4),
    0,
    100,
  ));
  const narrative = fragmentedEvidence
    ? `Root cause confidence is ${rcaConfidence}% and investigation evidence is distributed across ${toolCount} tools. This may increase context-switching during incident response and contribute to longer resolution cycles.`
    : rcaConfidence < 70
      ? `Root cause confidence is ${rcaConfidence}%. This is a potential signal of investigation friction observed across affected entities.`
      : `Root cause confidence is ${rcaConfidence}%. No evidence-fragmentation warning is indicated by the currently detected tool data.`;
  return { score, rcaConfidence, evidenceFragmentation, toolCount, signalSourceCount, detectedTools, narrative };
}

function renderInvestigationComplexityCard(pat, patterns=[]) {
  const patternToolRows = matchToolDetectionRowsToPattern(pat, TOOL_DETECTION_ROWS);
  const insight = buildInvestigationComplexity({ pattern:pat, toolRows:patternToolRows });
  if (insight.rcaConfidence >= 70 && insight.toolCount <= 1) return '';
  const caution = insight.toolCount > 1 && insight.rcaConfidence < 70;
  const vendors = insight.detectedTools.map(tool => tool.vendor);
  const purposes = uniqVals(insight.detectedTools.flatMap(tool => tool.purposes));
  return `<div class="investigation-complexity ${caution ? 'caution' : ''}">
    <div class="ic-head">
      <div>
        <div class="ic-title">Investigation Complexity</div>
        <div class="ic-sub">Contextual insight based on currently available pattern evidence</div>
      </div>
    </div>
    <div class="ic-metrics">
      <div><strong>${insight.score}</strong><span>Complexity score</span></div>
      <div><strong>${insight.rcaConfidence}%</strong><span>RCA confidence</span></div>
      <div><strong>${insight.toolCount}</strong><span>Tools detected</span></div>
    </div>
    ${vendors.length ? `<div class="ic-chip-row">${vendors.map(vendor => `<span class="ic-tool-chip">${attrText(vendor)}</span>`).join('')}</div>` : ''}
    ${purposes.length ? `<div class="ic-chip-row">${purposes.map(purpose => `<span class="ic-purpose-chip">${attrText(purpose)}</span>`).join('')}</div>` : ''}
    <p>${insight.narrative}</p>
  </div>`;
}

function renderPatternDetailPane(pat, patterns) {
  if (!pat) return `<div class="px-detail"><div class="exec-empty">Select a pattern to inspect recurrence evidence.</div></div>`;
  const rec = pat.recommendation || {};
  const rca = pat.dimensions?.rootCauseEntities || [];
  const services = patternServices(pat);
  const envs = patternEnvironments(pat);
  const teams = patternTeams(pat);
  const openCount = patternOpenCount(pat);
  const reason = highImpactReason(pat, patterns) || 'recurrence and concentration';
  const resolved = (pat.problems || []).filter(p => p.status === 'RESOLVED' && p.dur);
  const avg = resolved.length ? arrMean(resolved.map(p => p.dur)) : 0;
  return `<div class="px-detail">
    <div>
      <div class="px-detail-title">${pat.title}</div>
      <div class="px-detail-sub">Why next: ${reason} | priority ${patternPriorityScore(pat, patterns)} | ${pat.occurrences} occurrences</div>
    </div>
    <div class="px-detail-grid">
      <div class="px-detail-metric"><strong>${pat.occurrences}x</strong><span>Occurrences</span></div>
      <div class="px-detail-metric"><strong>${fmtC(patternCost(pat))}</strong><span>Cost impact</span></div>
      <div class="px-detail-metric"><strong>${openCount}</strong><span>Open</span></div>
      <div class="px-detail-metric"><strong>${patternConfidenceScore(pat)}</strong><span>Confidence</span></div>
    </div>
    <div class="px-section">
      <div class="px-section-title">Impacted entities</div>
      <div class="px-chip-list">
        ${services.slice(0, 12).map(s => `<span class="px-chip">Service: ${s}</span>`).join('') || '<span class="px-chip">No service entity</span>'}
        ${envs.slice(0, 8).map(e => `<span class="px-chip">Env: ${e}</span>`).join('')}
        ${teams.slice(0, 8).map(t => `<span class="px-chip">Team: ${t}</span>`).join('')}
      </div>
    </div>
    <div class="px-section">
      <div class="px-section-title">Evidence</div>
      <div class="px-evidence">
        <div class="px-evidence-row"><span>Recurrence</span><strong>${pat.occurrences} events between ${fmtR(pat.firstSeen)} and ${fmtR(pat.lastSeen)}</strong></div>
        <div class="px-evidence-row"><span>Trend</span><strong>${pat.trend}</strong></div>
        <div class="px-evidence-row"><span>MTTR</span><strong>${avg ? fmtM(avg) : 'No resolved duration data'}</strong></div>
        <div class="px-evidence-row"><span>Quality</span><strong>${patternConfidenceScore(pat)} / 100 | concentration ${pat.concentration}</strong></div>
      </div>
    </div>
    ${renderInvestigationComplexityCard(pat, patterns)}
    <div class="px-section">
      <div class="px-section-title">Root-cause indicators</div>
      <div class="px-chip-list">
        ${rca.slice(0, 10).map(r => `<span class="px-chip">RCA: ${r}</span>`).join('') || '<span class="px-chip">Root cause not consistently identified</span>'}
        <span class="px-chip">Fixability: ${pat.fixability}</span>
        <span class="px-chip">RCA consistency: ${Math.round((pat.rcaConsistency || 0) * 100)}%</span>
      </div>
    </div>
    <div class="px-section">
      <div class="px-section-title">Recommended actions</div>
      <div class="px-action-box">
        <strong>Dynatrace Assist:</strong> Request pattern-level remediation guidance using aggregated recurrence, impact, entity, RCA, MTTR, and cost evidence.
        <div style="margin-top:8px"><button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${pat.id}">Get Remediation Path</button></div>
      </div>
    </div>
  </div>`;
}

function buildPattern(problems) {
  const times    = problems.map(p => p.start).sort((a, b) => a - b);
  const durations = problems.filter(p => p.dur).map(p => p.dur);
  const avgDur   = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const totalCost = problems.reduce((s, p) => s + calcCost(p).total, 0);
  const totalUsers = problems.reduce((s, p) => s + (p.users || 0), 0);
  const autoResolves = problems.filter(p => p.status === 'RESOLVED' && p.dur && p.dur <= 15 && p.users === 0).length;
  const hasRCA   = problems.some(p => p.hasRCA);
  const rcaValues = [...new Set(problems.filter(p => p.hasRCA && p.rca).map(p => p.rca))];
  const consistentRCA = rcaValues.length === 1;

  // Time cluster detection - do events genuinely cluster at the same UTC hour?
  // Only valid timestamps (not NaN from bad parses) are counted.
  const hours = problems.map(p => new Date(p.start).getUTCHours()).filter(h => !isNaN(h));
  const hourCounts = {};
  hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const maxHourCount = hours.length ? Math.max(...Object.values(hourCounts)) : 0;
  const dominantHourKey = Object.keys(hourCounts).find(h => hourCounts[h] === maxHourCount);
  const dominantHour = dominantHourKey !== undefined ? parseInt(dominantHourKey, 10) : 0;
  // Require ≥5 valid events AND ≥70% at the same hour to avoid false positives
  const hasTimeCluster = hours.length >= 5 && maxHourCount / hours.length >= 0.7;

  // Recurrence score (0-100)
  const daySpan = Math.max(1, (times[times.length - 1] - times[0]) / 86400000);
  const dailyRate = problems.length / daySpan;
  const recScore = Math.min(100, Math.round(dailyRate >= 3 ? 100 : dailyRate >= 1 ? 80 : dailyRate >= 0.5 ? 60 : dailyRate * 120));

  // Trend: compare first half vs second half frequency
  const mid = Math.floor(problems.length / 2);
  const firstSpan  = problems.length >= 4 ? (times[mid - 1]   - times[0]) / 86400000 || 1 : 1;
  const secondSpan = problems.length >= 4 ? (times[times.length - 1] - times[mid]) / 86400000 || 1 : 1;
  const firstRate  = mid / firstSpan;
  const secondRate = (problems.length - mid) / secondSpan;
  const trend = problems.length < 3 ? 'STABLE'
    : secondRate > firstRate * 1.3 ? 'INCREASING'
    : secondRate < firstRate * 0.7 ? 'DECREASING'
    : 'STABLE';

  // Spark data - one point per problem, value = cost
  const sparkData = problems.map(p => ({ t: p.start, v: calcCost(p).total }));
  const dimensions = buildPatternDimensions(problems);

  // ── Pattern quality score ──
  const rcaList        = problems.filter(p=>p.hasRCA&&p.rca).map(p=>p.rca);
  const topRca         = arrMode(rcaList);
  const rcaConsistency = rcaList.length>0
    ? rcaList.filter(r=>r===topRca).length/problems.filter(p=>p.hasRCA).length
    : 0;
  const uniqueTitles   = new Set(problems.map(p=>p.title)).size;
  const clusterPurity  = clamp(1-((uniqueTitles-1)/problems.length),0,1);
  const gaps           = times.slice(1).map((t,i)=>t-times[i]);
  const interArrivalCV = gaps.length>1 ? arrStddev(gaps)/(arrMean(gaps)||1) : 1.0;
  const recurrenceStability = clamp(1-interArrivalCV,0,1);
  const costs          = problems.map(p=>calcCost(p).total);
  // Cost predictability: 1 − coefficient of variation (stddev/mean), capped to [0,1]
  // CV near 0 = each occurrence costs about the same (predictable). CV > 1 = costs vary wildly.
  const costCV         = arrMean(costs) > 0 ? arrStddev(costs) / arrMean(costs) : 0;
  const costConsistency= clamp(1 - costCV, 0, 1);
  const dimensionPurity= dimensions.dimensionPurity;
  const qualityScore   = Math.round(
    clusterPurity      *25 +
    rcaConsistency     *30 +
    recurrenceStability*15 +
    costConsistency    *15 +
    dimensionPurity    *15
  );

  // Concentration: how tightly cost + entities cluster (high = one entity dominates)
  // Uses cost predictability (1 − CV) instead of Gini - easier to explain and equivalent directionally
  const concentrationRaw   = clamp(clusterPurity * 0.3 + costConsistency * 0.3 + dimensionPurity * 0.4, 0, 1);
  const concentration = scoreLabel(concentrationRaw);
  const concentrationScore = concentration[0] + concentration.slice(1).toLowerCase();

  // Fixability: how actionable is this pattern (high = consistent RCA + stable recurrence + tight cluster)
  const fixabilityRaw   = clamp(rcaConsistency * 0.45 + recurrenceStability * 0.25 + clusterPurity * 0.15 + dimensionPurity * 0.15, 0, 1);
  const fixability = scoreLabel(fixabilityRaw);
  const fixabilityScore = fixability[0] + fixability.slice(1).toLowerCase();

  // Recommendation
  const rec = recommendAction({
    recurrenceScore: recScore,
    autoResolveRate: autoResolves / problems.length,
    avgDuration: avgDur,
    avgUsersAffected: totalUsers / problems.length,
    avgImpactScore: problems.reduce((s, p) => s + p.impact, 0) / problems.length,
    hasTimeCluster,
    dominantHour,
    hasRCA,
    consistentRCA,
    rcaLabel: rcaValues[0] || null,
    frequency: problems.length,
    trend,
    totalCost,
  });

  return {
    id: 'pat-' + patternSignature(problems[0]).replace(/\W+/g, '-').substring(0, 36),
    signature: patternSignature(problems[0]),
    causalEntity: patternEntityKey(problems[0]),
    dimensions,
    title: problems[0].biz || problems[0].title,
    problems,
    occurrences: problems.length,
    firstSeen: times[0],
    lastSeen: times[times.length - 1],
    avgDur,
    totalCost,
    totalUsers,
    recurrenceScore: recScore,
    trend,
    hasTimeCluster,
    dominantHour,
    hasRCA,
    consistentRCA,
    rcaLabel: rcaValues[0] || null,
    autoResolveRate: autoResolves / problems.length,
    severity: problems[0].sev,
    sparkData,
    recommendation: rec,
    qualityScore,
    rcaConsistency,
    clusterPurity,
    dimensionPurity,
    interArrivalCV,
    recurrenceStability,
    concentrationRaw,
    concentrationScore,
    concentration,
    fixabilityRaw,
    fixabilityScore,
    fixability,
    confidence: confidenceLevel(clamp(qualityScore/100 + clamp((problems.length-2)/8,0,0.15), 0, 1)),
    expanded: false,
  };
}

// ── Recommendation Engine ──
const REC_META = {
  ADD_TIME_WINDOW:   { icon: '⏱',  label: 'Add Time Window',   color: 'var(--amber)' },
  FIX_ROOT_CAUSE:    { icon: '🔁', label: 'Fix Root Cause',     color: 'var(--blue)'  },
  INVESTIGATE_FIRST: { icon: '🔍', label: 'Investigate First',  color: 'var(--violet)'},
};

function recommendAction(p) {
  // 1. Time cluster - scheduled batch job or deployment window
  if (p.hasTimeCluster) {
    return {
      type: 'ADD_TIME_WINDOW', confidence: 85,
      text: `Occurrences cluster around ${String(p.dominantHour).padStart(2,'0')}:00 UTC - likely a scheduled batch job or deployment window.`,
      config: `alert.suppress_window(start="${String(p.dominantHour).padStart(2,'0')}:00", duration="2h", days="all")`,
    };
  }

  // 2. Recurring with consistent root cause - engineering problem, not alerting problem
  if (p.hasRCA && p.consistentRCA && p.frequency >= 3) {
    return {
      type: 'FIX_ROOT_CAUSE', confidence: 91,
      text: `Same root cause (${p.rcaLabel}) identified across ${p.frequency} occurrences - alerting is surfacing unresolved technical debt.`,
      config: `problem.root_cause="${p.rcaLabel}" // assign to owning team for permanent fix`,
    };
  }

  // 3. Default - investigate before taking action
  return {
    type: 'INVESTIGATE_FIRST', confidence: 88,
    text: `Occurred ${p.frequency}x ${p.hasRCA ? 'with inconsistent root cause' : 'with no root cause documented'}. Attach Live Debugger to the next occurrence to capture state.`,
    config: `live_debugger.arm(trigger="next_occurrence", capture=["variables","stack","request"])`,
  };
}

// ── Render Pattern Intelligence ──
let expandedPatterns = new Set();
let expandedActions = new Set();
let execPatternsOpen = false;

function renderPatternIntelligence() {
  const ps = getFiltered();
  const { patterns, oneOffs } = detectPatterns(ps);

  // Update tab counts
  document.getElementById('patternTabCount').textContent  = patterns.length;
  document.getElementById('explorerTabCount').textContent = ps.length;

  // Summary bar
  const patternCost = patterns.reduce((s, pat) => s + pat.totalCost, 0);
  const patternOccurrences = patterns.reduce((s, pat) => s + pat.occurrences, 0);
  const fixable = patterns.filter(pat => ['FIX_ROOT_CAUSE','ADD_TIME_WINDOW'].includes(pat.recommendation.type)).length;
  if (persona === 'executive') {
    document.getElementById('intelSummary').innerHTML = '';
  } else {
  document.getElementById('intelSummary').innerHTML = `
    <div class="intel-icon">P</div>
    <div class="intel-main">
      <div class="intel-headline">${patterns.length} patterns across ${patternOccurrences} grouped problems - ${ps.length} total problems</div>
      <div class="intel-sub">${fixable} patterns have clear actionable paths | ${oneOffs.length} one-off problems below pattern threshold</div>
    </div>
    <div class="intel-stats">
      <div class="intel-stat">
        <div class="intel-stat-val" style="color:var(--coral)">${patterns.length}</div>
        <div class="intel-stat-lbl">Patterns</div>
      </div>
      <div class="intel-stat">
        <div class="intel-stat-val" style="color:var(--amber)">${fmtC(patternCost)}</div>
        <div class="intel-stat-lbl">Pattern Cost</div>
      </div>
      <div class="intel-stat">
        <div class="intel-stat-val" style="color:var(--green)">${fixable}</div>
        <div class="intel-stat-lbl">Actionable</div>
      </div>
    </div>`;
  }

  // Executive gets spotlight tiles + ranked list; engineers get sub-bucket cards
  if (persona === 'executive') {
    renderDecisionFirstExecView(patterns, ps);
    renderOneOffs(oneOffs);
    document.getElementById('explorerTabCount').textContent = ps.length;
    return;
  }

  // Pattern cards (engineer / SRE / developer)
  const TREND_ICONS = { INCREASING: 'up', STABLE: '->', DECREASING: 'down' };
  const TREND_LABELS = { INCREASING: 'Worsening', STABLE: 'Stable', DECREASING: 'Improving' };
  const SEV_CLASS = { AVAILABILITY: 'severity-high', ERROR: 'severity-high', PERFORMANCE: 'severity-med', RESOURCE_CONTENTION: 'severity-low', CUSTOM_ALERT: 'severity-low' };

  document.getElementById('patternGrid').innerHTML = patterns.map(pat => {
    const rec  = pat.recommendation;
    const meta = REC_META[rec.type] || REC_META.TUNE_FREQUENCY;
    const recColor = pat.recurrenceScore >= 80 ? 'var(--coral)' : pat.recurrenceScore >= 50 ? 'var(--amber)' : 'var(--blue)';
    const actionBtns = buildPatternActions(pat);

    // ── Section divider (pattern bucket header) ──
    const sectionHdr = `<div class="pattern-section-hdr">
      <span class="psh-icon">${meta.icon}</span>
      <span class="psh-title">${pat.title}</span>
      <span class="psh-pill">${pat.occurrences}x</span>
      ${renderPatternDimensionChips(pat)}
      <span class="trend-chip ${pat.trend}">${TREND_ICONS[pat.trend]} ${TREND_LABELS[pat.trend]}</span>
      <span class="exec-pat-chip ${pat.concentration === 'HIGH' ? 'conc-high' : pat.concentration === 'MEDIUM' ? 'conc-med' : 'conc-low'}">Conc: ${pat.concentration}</span>
      <span class="exec-pat-chip ${pat.fixability === 'HIGH' ? 'fix-high' : pat.fixability === 'MEDIUM' ? 'fix-med' : 'fix-low'}">Fix: ${pat.fixability}</span>
      ${renderConfidenceBadge(pat.confidence, 'pattern')}
      ${pat.hasTimeCluster ? `<span class="psh-pill" style="color:var(--amber)">⏱ ${String(pat.dominantHour).padStart(2,'0')}:00</span>` : ''}
      <span class="psh-cost">${fmtC(pat.totalCost)}</span>
      <div class="psh-rec-track"><div class="psh-rec-fill" style="width:${pat.recurrenceScore}%;background:${recColor}"></div></div>
      <span class="psh-rec-pct" style="color:${recColor}">${pat.recurrenceScore}%</span>
    </div>`;

    // ── One card per unique (entity x RCA) sub-bucket ──
    const subBuckets = groupIntoSubBuckets(pat);
    const cardsHtml = subBuckets.map(sb => {
      const openCount = sb.problems.filter(p => p.status === 'OPEN').length;
      const sbStatus  = openCount > 0 ? 'OPEN' : 'RESOLVED';
      const sbCost    = sb.problems.reduce((s, p) => s + calcCost(p).total, 0);
      const rcaChip   = sb.rcaLabel
        ? `<span class="sb-rca-chip">RCA: ${sb.rcaLabel}</span>`
        : `<span class="sb-rca-chip sb-rca-unknown">No RCA identified</span>`;
      return `<div class="sb-card ${SEV_CLASS[pat.severity] || 'severity-low'}">
        <div class="sb-card-strip ${rec.type}"></div>
        <div class="sb-card-body">
          <div class="sb-card-hdr">
            <span class="sdot ${sbStatus}"></span>
            <span class="sb-card-entity">${sb.entityLabel}</span>
            ${rcaChip}
            <span class="sb-card-count">${sb.problems.length}x</span>
            <span class="sb-card-cost">${fmtC(sbCost)}</span>
            <span class="lbtn" data-action="drillToExplorer" data-pid="${sb.problems[0]?.id}" title="Drill into problems">↗</span>
          </div>
          <div class="sb-insight" id="sb-insight-${sb.id}">${renderSubBucketContent(sb.id)}</div>
        </div>
      </div>`;
    }).join('');

    // ── Actions footer beneath this pattern's cards ──
    const actionsHtml = persona === 'executive' ? (() => {
      const actOpen = expandedActions.has(pat.id);
      const recHtml = rec.type !== 'ADD_TIME_WINDOW' ? `
        <div class="pc-rec-box ${rec.type}">
          <div class="pc-rec-header">
            <span class="pc-rec-type">${meta.icon} ${meta.label}</span>
            <span class="pc-rec-conf">${rec.confidence}% confidence</span>
          </div>
          <div class="pc-rec-text">${rec.text}</div>
          <div class="pc-rec-config">${rec.config}</div>
        </div>` : '';
      return `<div class="pc-actions-collapse" data-stop-propagation="1">
        <button class="pc-collapse-btn" data-action="togglePatternActions" data-pid="${pat.id}">
          ${actOpen ? '▾ Hide actions' : '▸ Recommended actions'}
        </button>
        ${actOpen ? `<div class="pc-actions-panel">${recHtml}<div class="pc-actions">${actionBtns}</div></div>` : ''}
      </div>`;
    })() : `<div class="pc-rec-box ${rec.type}">
      <div class="pc-rec-header">
        <span class="pc-rec-type">${meta.icon} ${meta.label}</span>
        <span class="pc-rec-conf">${rec.confidence}% confidence</span>
      </div>
      <div class="pc-rec-text">${rec.text}</div>
      <div class="pc-rec-config">${rec.config}</div>
    </div>
    <div class="pc-actions" data-stop-propagation="1">${actionBtns}</div>`;

    return `<div class="pattern-section">${sectionHdr}${cardsHtml}<div class="pattern-section-footer">${actionsHtml}</div></div>`;
  }).join('');

  // One-offs section
  renderOneOffs(oneOffs);

  // Update tab counts for explorer too
  document.getElementById('explorerTabCount').textContent = ps.length;

  // Kick off Davis insight fetches only after real Grail data has loaded (not demo data)
  // Dynatrace Assist calls are intentionally on demand at pattern level for scale.
}

function buildPatternActions(pat) {
  const rec = pat.recommendation;
  const pid = pat.problems[0]?.id;
  const actions = [];

  if (rec.type === 'ADD_TIME_WINDOW') {
    if (persona !== 'executive') {
      actions.push(`<button class="pc-action suppress" data-action="patternAction" data-pid="${pat.id}" data-type="window">⏱ Add Time Window</button>`);
    }
  } else if (rec.type === 'FIX_ROOT_CAUSE') {
    actions.push(`<button class="pc-action fix" data-action="patternAction" data-pid="${pat.id}" data-type="fix">🔁 Assign Root Fix</button>`);
  } else {
    actions.push(`<button class="pc-action debugger" data-action="patternAction" data-pid="${pat.id}" data-type="debug">Lightning Arm Live Debugger</button>`);
  }

  actions.push(`<button class="pc-action ticket" data-action="patternAction" data-pid="${pat.id}" data-type="ticket">Ticket Create Ticket</button>`);
  actions.push(`<button class="pc-action drill" data-action="drillIntoPattern" data-pid="${pat.id}"> View All</button>`);

  return actions.join('');
}

// ── Session-level aggregates for executive board ──
function calcSessionMetrics(ps, patterns) {
  const occMap = new Map();
  patterns.forEach(pat => pat.problems.forEach(p => occMap.set(p.id, pat.occurrences)));

  const valueBreakdown = {
    mttrSavings: 0,
    aiCorrelationSavings: 0,
    noiseReductionSavings: 0,
    total: 0,
  };
  ps.forEach(p => {
    const v = calculateValueBreakdown(p, occMap.get(p.id) || 1);
    valueBreakdown.mttrSavings           += v.mttrSavings;
    valueBreakdown.aiCorrelationSavings  += v.aiCorrelationSavings;
    valueBreakdown.noiseReductionSavings += v.noiseReductionSavings;
  });
  valueBreakdown.mttrSavings           = Math.round(valueBreakdown.mttrSavings);
  valueBreakdown.aiCorrelationSavings  = Math.round(valueBreakdown.aiCorrelationSavings);
  valueBreakdown.noiseReductionSavings = Math.round(valueBreakdown.noiseReductionSavings);
  valueBreakdown.total = valueBreakdown.mttrSavings + valueBreakdown.aiCorrelationSavings + valueBreakdown.noiseReductionSavings;
  const valueDeliveredTotal = valueBreakdown.total;

  const autoCorrelationRate      = ps.length ? ps.filter(p=>p.hasRCA).length/ps.length : 0;
  const noiseReductionRate       = ps.length ? ps.filter(p=>p.noise).length/ps.length  : 0;
  const estimatedEventsSuppressed= ps.filter(p=>p.noise).length*8;

  const withRCA    = ps.filter(p=>p.hasRCA  && p.status==='RESOLVED' && p.dur>0);
  const withoutRCA = ps.filter(p=>!p.hasRCA && p.status==='RESOLVED' && p.dur>0);
  const avgMttrWithRCA    = withRCA.length    ? Math.round(arrMean(withRCA.map(p=>p.dur)))    : null;
  const avgMttrWithoutRCA = withoutRCA.length ? Math.round(arrMean(withoutRCA.map(p=>p.dur))) : null;
  const mttrLift = avgMttrWithRCA && avgMttrWithoutRCA && avgMttrWithRCA>0
    ? +(avgMttrWithoutRCA/avgMttrWithRCA).toFixed(1) : null;

  const qualScores   = patterns.map(pat=>pat.qualityScore||0);
  const avgQuality   = qualScores.length ? Math.round(arrMean(qualScores)) : null;
  const lowConfCount = patterns.filter(pat=>(pat.qualityScore||0)<50).length;

  // System Direction: combines cost, recurrence, and MTTR trend.
  const incCount  = patterns.filter(p=>p.trend==='INCREASING').length;
  const decCount  = patterns.filter(p=>p.trend==='DECREASING').length;
  const incCost = patterns.filter(p=>p.trend==='INCREASING').reduce((s,p)=>s+p.totalCost,0);
  const decCost = patterns.filter(p=>p.trend==='DECREASING').reduce((s,p)=>s+p.totalCost,0);
  const costTrend = incCost > decCost * 1.1 ? 'UP' : decCost > incCost * 1.1 ? 'DOWN' : 'FLAT';
  const recurrenceTrend = incCount > decCount ? 'UP' : decCount > incCount ? 'DOWN' : 'FLAT';
  const mttrTrend = avgMttrWithRCA && avgMttrWithoutRCA
    ? avgMttrWithRCA > avgMttrWithoutRCA * 1.1 ? 'UP' : avgMttrWithoutRCA > avgMttrWithRCA * 1.1 ? 'DOWN' : 'FLAT'
    : patterns.some(p=>p.trend==='INCREASING' && p.avgDur>60) ? 'UP' : patterns.some(p=>p.trend==='DECREASING') ? 'DOWN' : 'FLAT';
  const systemDirection = calculateSystemDirection(costTrend, recurrenceTrend, mttrTrend);

  // Change over time: approximate from pattern trend data
  const costTrendUp = costTrend === 'UP';
  const mttrTrendUp = mttrTrend === 'UP';
  const newPatterns    = patterns.filter(p => (Date.now() - p.firstSeen) < 2*86400000).length;
  const resolvedPats   = patterns.filter(p => p.problems.every(pr=>pr.status==='RESOLVED')).length;

  // Average cost confidence across problems
  const avgCostConf = ps.length ? arrMean(ps.map(p => costConfidence(p))) : 0.5;

  return {
    valueDeliveredTotal, valueBreakdown,
    autoCorrelationRate, noiseReductionRate, estimatedEventsSuppressed,
    avgMttrWithRCA, avgMttrWithoutRCA, mttrLift,
    avgQuality, lowConfCount,
    systemDirection, costTrend, recurrenceTrend, mttrTrend, costTrendUp, mttrTrendUp, newPatterns, resolvedPats,
    avgCostConf,
  };
}

// ── Executive Board: 3-tier KPI + drivers + tech stack + efficiency chips ──
function renderExecutivePatternDetail(pat) {
  const d = pat.dimensions || {};
  const rec = pat.recommendation || {};
  const openCount = pat.problems.filter(p => p.status === 'OPEN').length;
  const dim = (label, value) => value ? `<div><span>${label}</span><strong>${value}</strong></div>` : '';
  const detailRows = pat.problems
    .slice()
    .sort((a, b) => b.start - a.start)
    .slice(0, 6)
    .map(p => `<div class="exec-pat-occ">
      <span class="sdot ${p.status}"></span>
      <span class="exec-pat-occ-title">${p.displayId || p.id}</span>
      <span>${SEV_LBL[p.sev] || p.sev}</span>
      <span>${p.rca || 'No RCA'}</span>
      <span>${fmtR(p.start)}</span>
      <span>${p.dur ? fmtM(p.dur) : 'Ongoing'}</span>
      <span>${fmtC(calcCost(p).total)}</span>
    </div>`).join('');

  return `<div class="exec-pattern-detail">
    <div class="exec-pattern-detail-grid">
      ${dim('Root cause', d.primaryRootCause || pat.rcaLabel || 'Not consistently identified')}
      ${dim('Primary service', d.primaryService)}
      ${dim('Zone', d.primaryZone)}
      ${dim('Region', d.primaryRegion)}
      ${dim('Occurrences', `${pat.occurrences} total, ${openCount} open`)}
      ${dim('Estimated cost', fmtC(pat.totalCost))}
    </div>
    <div class="exec-pattern-rec">
      <strong>${REC_META[rec.type]?.label || 'Recommended action'}</strong>
      <span>${rec.text || 'Review the recurring pattern and assign an owner.'}</span>
    </div>
    <div class="exec-pat-occ-head">
      <span>Status</span><span>Problem</span><span>Severity</span><span>RCA</span><span>Seen</span><span>Duration</span><span>Cost</span>
    </div>
    ${detailRows}
  </div>`;
}

function renderExecutivePatternsBoard(patterns, ps, label='Patterns') {
  const TREND_ICON  = { INCREASING: 'up', STABLE: '->', DECREASING: 'down' };
  const TREND_CLS   = { INCREASING: 'trend-up', STABLE: 'trend-stable', DECREASING: 'trend-dn' };
  const FIX_CLS     = { HIGH: 'fix-high', MEDIUM: 'fix-med', LOW: 'fix-low', High: 'fix-high', Medium: 'fix-med', Low: 'fix-low' };
  const CONC_CLS    = { HIGH: 'conc-high', MEDIUM: 'conc-med', LOW: 'conc-low', High: 'conc-high', Medium: 'conc-med', Low: 'conc-low' };
  const TREND_TOOLTIP = {
    INCREASING: 'Trend: rate in second half of period is >30% higher than first half - pattern is worsening',
    STABLE:     'Trend: occurrence rate is consistent across the period',
    DECREASING: 'Trend: rate in second half is >30% lower than first half - pattern is improving',
  };
  const CONC_TOOLTIP = 'Concentration: how tightly all incidents in this pattern point to a single component.';
  const FIX_TOOLTIP  = 'Fixability: how likely a single engineering action can permanently resolve this pattern.';
  const totalOccurrences = patterns.reduce((s, pat) => s + pat.occurrences, 0);
  const totalPatternCost = patterns.reduce((s, pat) => s + pat.totalCost, 0);
  const emptyMessage = label === 'High-impact patterns'
    ? 'No high-impact patterns in this selection. High impact is based on Davis impact, cost materiality, open occurrences, and recurring availability risk.'
    : 'No recurring patterns detected for this selection.';
  const patternRow = pat => {
    const openCount = pat.problems.filter(p => p.status === 'OPEN').length;
    const cost = pat.problems.reduce((s, p) => s + calcCost(p).total, 0);
    const d = pat.dimensions || {};
    return `<div class="exec-t2-row exec-pattern-row">
      <span class="exec-t2-badge exec-t2-pattern">Pattern</span>
      <span class="exec-t2-name" title="${pat.title}">${pat.title}</span>
      <div class="exec-t2-chips">
        <span class="exec-pat-chip ${TREND_CLS[pat.trend]}" title="${TREND_TOOLTIP[pat.trend]}">${TREND_ICON[pat.trend]} ${pat.trend[0]+pat.trend.slice(1).toLowerCase()}</span>
        ${isHighImpactPattern(pat, patterns) ? `<span class="exec-pat-chip trend-up" title="High impact: ${highImpactReason(pat, patterns)}">Impact: High</span>` : ''}
        <span class="exec-pat-chip ${CONC_CLS[pat.concentration]}" title="${CONC_TOOLTIP}">Conc: ${pat.concentration}</span>
        <span class="exec-pat-chip ${FIX_CLS[pat.fixability]}" title="${FIX_TOOLTIP}">Fix: ${pat.fixability}</span>
        ${d.primaryRootCause ? `<span class="exec-pat-chip exec-dim-chip">RCA: ${d.primaryRootCause}</span>` : ''}
      </div>
      <span class="exec-t2-val">${pat.occurrences}x</span>
      <span class="exec-t2-meta">${fmtC(cost)}${openCount ? ` | ${openCount} open` : ''}</span>
      <button class="exec-detail-btn ${expandedPatterns.has(pat.id) ? 'open' : ''}" data-action="togglePatternExpand" data-pid="${pat.id}">
        ${expandedPatterns.has(pat.id) ? 'Hide' : 'Details'}
      </button>
    </div>
    ${expandedPatterns.has(pat.id) ? renderExecutivePatternDetail(pat) : ''}`;
  };
  return `<div class="exec-t2-board exec-patterns-board">
    <div class="exec-t2-hdr">${label} - ${patterns.length} patterns - ${totalOccurrences} pattern occurrences - ${fmtC(totalPatternCost)} pattern cost</div>
    <div class="exec-patterns-list">${patterns.length ? patterns.map(patternRow).join('') : `<div class="exec-empty">${emptyMessage}</div>`}</div>
  </div>`;
}

function renderExecutiveOccurrencesBoard(ps) {
  const rows = ps
    .slice()
    .sort((a, b) => b.start - a.start)
    .slice(0, 30)
    .map(p => `<div class="exec-pat-occ">
      <span class="sdot ${p.status}"></span>
      <span class="exec-pat-occ-title">${p.displayId || p.id}</span>
      <span>${SEV_LBL[p.sev] || p.sev}</span>
      <span>${p.rca || p.svcs?.[0] || 'No RCA'}</span>
      <span>${fmtR(p.start)}</span>
      <span>${p.dur ? fmtM(p.dur) : 'Ongoing'}</span>
      <span>${fmtC(calcCost(p).total)}</span>
    </div>`).join('');
  return `<div class="exec-t2-board exec-patterns-board">
    <div class="exec-t2-hdr">Occurrences - latest ${Math.min(ps.length, 30)} of ${ps.length}</div>
    <div class="exec-pat-occ-head">
      <span>Status</span><span>Problem</span><span>Severity</span><span>RCA / Entity</span><span>Seen</span><span>Duration</span><span>Cost</span>
    </div>
    ${rows}
  </div>`;
}

function renderExecutiveMttrBoard(patterns, ps) {
  const slowPatterns = patterns
    .filter(pat => pat.avgDur > 0)
    .sort((a, b) => b.avgDur - a.avgDur)
    .slice(0, 8);
  const rows = slowPatterns.map(pat => {
    const cost = pat.problems.reduce((s, p) => s + calcCost(p).total, 0);
    return `<div class="exec-t2-row exec-pattern-row">
      <span class="exec-t2-badge exec-t2-pattern">MTTR</span>
      <span class="exec-t2-name" title="${pat.title}">${pat.title}</span>
      <div class="exec-t2-chips">
        <span class="exec-pat-chip ${pat.trend === 'INCREASING' ? 'trend-up' : pat.trend === 'DECREASING' ? 'trend-dn' : 'trend-stable'}">${pat.trend[0]+pat.trend.slice(1).toLowerCase()}</span>
        <span class="exec-pat-chip ${pat.fixability === 'HIGH' ? 'fix-high' : pat.fixability === 'MEDIUM' ? 'fix-med' : 'fix-low'}">Fix: ${pat.fixability}</span>
      </div>
      <span class="exec-t2-val">${fmtM(pat.avgDur)}</span>
      <span class="exec-t2-meta">${pat.occurrences}x - ${fmtC(cost)}</span>
      <button class="exec-detail-btn ${expandedPatterns.has(pat.id) ? 'open' : ''}" data-action="togglePatternExpand" data-pid="${pat.id}">
        ${expandedPatterns.has(pat.id) ? 'Hide' : 'Details'}
      </button>
    </div>
    ${expandedPatterns.has(pat.id) ? renderExecutivePatternDetail(pat) : ''}`;
  }).join('');
  const resolved = ps.filter(p => p.status === 'RESOLVED' && p.dur);
  return `<div class="exec-t2-board exec-patterns-board">
    <div class="exec-t2-hdr">MTTR drivers - slowest recurring patterns - ${resolved.length} resolved occurrences</div>
    ${rows || '<div class="exec-empty">No resolved-duration data available for this selection.</div>'}
  </div>`;
}

function renderExecutiveKpiDetail(mode, ps) {
  const patterns = detectPatterns(ps).patterns;
  if (mode === 'patterns') return renderExecutivePatternsBoard(patterns, ps, 'Patterns');
  if (mode === 'impact') {
    const highImpact = patterns
      .filter(pat => isHighImpactPattern(pat, patterns))
      .sort((a, b) => patternCost(b) - patternCost(a));
    return renderExecutivePatternsBoard(highImpact, ps, 'High-impact patterns');
  }
  if (mode === 'occurrences') return renderExecutiveOccurrencesBoard(ps);
  if (mode === 'mttr') return renderExecutiveMttrBoard(patterns, ps);
  return '';
}

function renderKpiDetailCard({ title, value, why, drivers = [], action }) {
  return `<div class="exec-t2-board exec-patterns-board">
    <div class="exec-t2-hdr">${title}</div>
    <div class="px-evidence">
      <div class="px-evidence-row"><span>Current value</span><strong>${value}</strong></div>
      <div class="px-evidence-row"><span>Why it matters</span><strong>${why}</strong></div>
      ${drivers.map(driver => `<div class="px-evidence-row"><span>${driver.label}</span><strong>${driver.value}</strong></div>`).join('')}
      <div class="px-evidence-row"><span>Recommended next action</span><strong>${action}</strong></div>
    </div>
  </div>`;
}

function serviceCounts(ps) {
  const counts = new Map();
  (ps || []).forEach(p => (p.svcs || ['Unresolved service']).forEach(s => counts.set(s || 'Unresolved service', (counts.get(s || 'Unresolved service') || 0) + 1)));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function severityCounts(ps) {
  const counts = new Map();
  (ps || []).forEach(p => counts.set(p.sev || 'Unknown', (counts.get(p.sev || 'Unknown') || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderPersonaKpiDetail(currentPersona, mode, ps) {
  if (currentPersona === 'executive') return renderExecutiveKpiDetail(mode, ps);
  const patterns = detectPatterns(ps).patterns;
  const mttr = mttrSummaryFromProblems(ps);
  const open = ps.filter(p => p.status === 'OPEN').length;
  const resolved = ps.filter(p => p.status === 'RESOLVED').length;
  const missingRca = ps.filter(p => !p.hasRCA).length;
  const noisy = ps.filter(p => p.noise).length;
  const waste = calcRecurringWaste(ps);
  const topService = serviceCounts(ps)[0];
  const topSeverity = severityCounts(ps)[0];
  const topPattern = [...patterns].sort((a, b) => b.occurrences - a.occurrences)[0];
  const emptyAction = 'No problems are available in the selected period. Adjust the time range or filters.';

  const details = {
    'dev-open': {
      title: 'Open Errors',
      value: `${open} open of ${ps.length} total`,
      why: 'Open errors are the active work queue developers need to triage first.',
      drivers: [
        { label:'Top severity', value:topSeverity ? `${topSeverity[0]} (${topSeverity[1]})` : 'No problems' },
        { label:'Top service', value:topService ? `${topService[0]} (${topService[1]})` : 'No service data' },
      ],
      action: ps.length ? 'Open Problem Explorer and start with unresolved high-severity errors.' : emptyAction,
    },
    'dev-services': {
      title: 'Services Affected',
      value: `${serviceCounts(ps).length} services`,
      why: 'Service concentration shows where developers can focus investigation effort.',
      drivers: [
        { label:'Most affected service', value:topService ? `${topService[0]} (${topService[1]} problems)` : 'No service data' },
        { label:'Recurring patterns', value:`${patterns.length}` },
      ],
      action: ps.length ? 'Filter by the most affected service and inspect repeated root-cause signals.' : emptyAction,
    },
    'dev-rca': {
      title: 'Needs Investigation',
      value: `${missingRca} missing RCA`,
      why: 'Missing root cause blocks durable fixes and makes recurrence harder to prevent.',
      drivers: [
        { label:'RCA gap', value:`${ps.length ? Math.round(missingRca / ps.length * 100) : 0}% of problems` },
        { label:'Top recurring issue', value:topPattern ? `${topPattern.title} (${topPattern.occurrences}x)` : 'No recurring pattern' },
      ],
      action: ps.length ? 'Select a recurring issue and generate scoped analysis only when more evidence is needed.' : emptyAction,
    },
    'dev-mttr': {
      title: 'Median MTTR',
      value: fmtM(mttr.median),
      why: 'Median MTTR gives a stable view of typical developer resolution time without outlier distortion.',
      drivers: [
        { label:'p85 MTTR', value:fmtM(mttr.p85) },
        { label:'Resolved problems', value:`${mttr.count}` },
      ],
      action: mttr.count ? 'Inspect slow recurring patterns and validate whether RCA evidence is complete.' : 'No resolved-duration data is available for this period.',
    },
    'sre-total': {
      title: 'Operational Debt',
      value: `${ps.length} problems`,
      why: 'The total problem volume shows the current reliability workload for the selected period.',
      drivers: [
        { label:'Open now', value:`${open}` },
        { label:'Resolved', value:`${resolved}` },
      ],
      action: ps.length ? 'Prioritize repeat offenders and unresolved RCA before isolated issues.' : emptyAction,
    },
    'sre-waste': {
      title: 'Automation Candidates',
      value: fmtC(waste),
      why: 'Recurring waste indicates where automation or prevention could reduce repeated operational effort.',
      drivers: [
        { label:'Recurring patterns', value:`${patterns.length}` },
        { label:'Top repeat offender', value:topPattern ? `${topPattern.title} (${topPattern.occurrences}x)` : 'No recurring pattern' },
      ],
      action: patterns.length ? 'Select the highest-repeat pattern and decide whether to automate, assign ownership, or tune alerting.' : emptyAction,
    },
    'sre-noise': {
      title: 'Repeat Offenders',
      value: `${noisy} noise candidates`,
      why: 'Noise candidates consume on-call attention and can hide real reliability risk.',
      drivers: [
        { label:'Noisy share', value:`${ps.length ? Math.round(noisy / ps.length * 100) : 0}% of problems` },
        { label:'Top service', value:topService ? `${topService[0]} (${topService[1]})` : 'No service data' },
      ],
      action: ps.length ? 'Review recurring low-impact alerts for suppression windows or threshold tuning.' : emptyAction,
    },
    'sre-mttr': {
      title: 'Reliability Trend',
      value: fmtM(mttr.median),
      why: 'Median MTTR shows whether reliability operations are resolving typical incidents efficiently.',
      drivers: [
        { label:'p85 MTTR', value:fmtM(mttr.p85) },
        { label:'Resolved problems', value:`${mttr.count}` },
      ],
      action: mttr.count ? 'Focus on long-tail patterns with repeat recurrence and incomplete RCA.' : 'No resolved-duration data is available for this period.',
    },
  };

  const detail = details[mode];
  return detail ? renderKpiDetailCard(detail) : '';
}

function renderActFirstMap(patterns) {
  const ranked = [...patterns].map(pat => ({ pat, score: patternPriorityScore(pat, patterns), model: actFirstModel(pat, patterns) }))
    .sort((a, b) => b.score - a.score);
  const selected = patterns.find(p => p.id === patternExplorerState.selectedId) || ranked[0]?.pat;
  if (!ranked.length) {
    return `<section class="act-map"><div class="act-map-head"><div><div class="act-map-title">Act-First Map</div><div class="act-map-sub">No recurring patterns available for prioritization.</div></div></div></section>`;
  }
  const selectedModel = selected ? actFirstModel(selected, patterns) : null;
  const bubbles = ranked.map(({ pat, score, model }, idx) => {
    const selectedCls = pat.id === selected?.id ? ' selected' : '';
    const left = Math.round(8 + model.fixability * 84);
    const bottom = Math.round(9 + model.exposure * 80);
    const size = Math.round(clamp(18 + (pat.occurrences || 0) * 2 + Math.sqrt(Math.max(0, model.cost)) / 65, 20, 44));
    const tip = `${pat.title} | ${model.quadrant} | Exposure ${fmtC(model.cost)} | Recoverable ${fmtC(model.recoverable)} | ${model.reason}`;
    return `<button class="act-map-bubble${selectedCls}" data-action="selectPatternRow" data-act-map="1" data-pid="${pat.id}" tabindex="0" role="option" aria-selected="${pat.id === selected?.id}" aria-label="Priority ${idx + 1}: ${attrText(pat.title)}. ${attrText(model.quadrant)}. Exposure ${fmtC(model.cost)}. Recoverable ${fmtC(model.recoverable)}." title="${attrText(tip)}" style="left:${left}%;bottom:${bottom}%;width:${size}px;height:${size}px">
      <span>#${idx + 1}</span><em>${score}</em>
    </button>`;
  }).join('');
  return `
    <section class="act-map" aria-label="Act-First prioritization map">
      <div class="act-map-head">
        <div>
          <div class="act-map-title">Act-First Map</div>
          <div class="act-map-sub">Prioritize by cost exposure, recoverable value, recurrence, open risk, and action readiness.</div>
        </div>
        <div class="act-map-kbd">Arrow keys select - Enter opens remediation</div>
      </div>
      <div class="act-map-body">
        <div class="act-map-plot" role="listbox" aria-label="Patterns plotted by exposure and fixability">
          <div class="act-axis-label y">Higher exposure and recoverable value</div>
          <div class="act-axis-label x">Higher fixability and readiness to act</div>
          <div class="act-quad q1">Act first</div>
          <div class="act-quad q2">Escalate</div>
          <div class="act-quad q3">Monitor</div>
          <div class="act-quad q4">Quick wins</div>
          ${bubbles}
        </div>
        <div class="act-map-detail">
          <div class="act-detail-kicker">Selected Pattern</div>
          <div class="act-detail-title">${selected?.title || 'No pattern selected'}</div>
          <div class="act-detail-grid">
            <div><strong>${selectedModel ? fmtC(selectedModel.cost) : '-'}</strong><span>Exposure</span></div>
            <div><strong>${selectedModel ? fmtC(selectedModel.recoverable) : '-'}</strong><span>Recoverable</span></div>
            <div><strong>${selected ? selected.occurrences : '-'}</strong><span>Occurrences</span></div>
            <div><strong>${selected ? patternOpenCount(selected) : '-'}</strong><span>Open</span></div>
          </div>
          <div class="act-quadrant ${selectedModel ? selectedModel.quadrant.toLowerCase().replace(/\s+/g, '-') : ''}">${selectedModel?.quadrant || 'Select a pattern'}</div>
          <div class="act-reason">${selectedModel?.reason || 'Select a pattern to understand why it should be acted on now or monitored.'}</div>
          <button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${selected?.id || ''}" ${selected ? '' : 'disabled'}>Get Remediation Path</button>
        </div>
      </div>
    </section>`;
}

function conciseExecMetrics(ps, patterns) {
  const totalPatternCost = patterns.reduce((s, pat) => s + patternCost(pat), 0);
  const groupedProblems = patterns.reduce((s, pat) => s + pat.occurrences, 0);
  const highImpact = patterns.filter(pat => isHighImpactPattern(pat, patterns)).length;
  const riskBacklog = patterns.filter(pat => patternOpenCount(pat) > 0).length;
  const session = calcSessionMetrics(ps, patterns);
  const recoverable = patterns.length ? recoverableFromCost(totalPatternCost) + session.valueDeliveredTotal : 0;
  const mttr = MTTR_SUMMARY ? safeMttrSummary(MTTR_SUMMARY, ps) : mttrSummaryFromProblems(ps);
  return { totalPatternCost, groupedProblems, highImpact, riskBacklog, recoverable, mttr };
}

function renderConciseKpiRow(ps, patterns) {
  const m = conciseExecMetrics(ps, patterns);
  const recoveryPct = m.totalPatternCost ? Math.round((m.recoverable / m.totalPatternCost) * 100) : 0;
  const cards = [
    { key:'risk', label:'Open Risk Exposure', value:fmtC(m.totalPatternCost), sub:`${m.highImpact} high-impact pattern${m.highImpact!==1?'s':''}`, cls:'risk' },
    { key:'recoverable', label:'Recoverable Now', value:fmtC(m.recoverable), sub:`${recoveryPct}% of exposure`, cls:'recover' },
    { key:'patterns', label:'Active Patterns', value:patterns.length, sub:`${m.groupedProblems} grouped | ${m.riskBacklog} risk backlog`, cls:'patterns' },
    { key:'resolution', label:'Median MTTR', value:fmtM(m.mttr.median), sub:`p85 ${fmtM(m.mttr.p85)} | ${m.mttr.count || 0} resolved`, cls:'time' },
  ];
  return `<section class="cx-kpis">${cards.map(c => `
    <button class="cx-kpi ${c.cls} ${execMetricDrilldown === c.key ? 'selected' : ''}" data-action="selectExecMetric" data-metric="${c.key}" aria-pressed="${execMetricDrilldown === c.key}">
      <div class="cx-kpi-label">${c.label}</div>
      <div class="cx-kpi-value">${c.value}</div>
      <div class="cx-kpi-sub">${c.sub}</div>
    </button>`).join('')}</section>`;
}

function renderMetricDrilldown(ps, patterns) {
  const m = conciseExecMetrics(ps, patterns);
  const ranked = [...patterns].sort((a, b) => patternPriorityScore(b, patterns) - patternPriorityScore(a, patterns));
  const topPattern = ranked[0] || null;
  const recoveryPct = m.totalPatternCost ? Math.round(m.recoverable / m.totalPatternCost * 100) : 0;
  const base = {
    risk: {
      label:'Open Risk Exposure',
      value:fmtC(m.totalPatternCost),
      why:`${fmtC(m.totalPatternCost)} exposure is concentrated across ${m.highImpact} high-impact pattern${m.highImpact === 1 ? '' : 's'}.`,
      action:'Review the Act-First Map to decide whether to remediate now or assign ownership.',
      related:topPattern,
    },
    recoverable: {
      label:'Recoverable Now',
      value:fmtC(m.recoverable),
      why:`${fmtC(m.recoverable)} is modeled as recoverable, representing ${recoveryPct}% of current exposure based on recurring pattern reduction assumptions.`,
      action:'Validate the remediation path before committing effort.',
      related:topPattern,
    },
    patterns: {
      label:'Active Patterns',
      value:String(patterns.length),
      why:`${patterns.length} recurring patterns remain active. ${m.groupedProblems} problems were grouped, reducing investigation scope and prioritizing recurring operational risk.`,
      action:'Use Pattern Explorer to assign ownership to the highest-priority recurring pattern.',
      related:topPattern,
    },
    resolution: {
      label:'Median MTTR',
      value:fmtM(m.mttr.median),
      why:`Median MTTR is ${fmtM(m.mttr.median)}, while p85 is ${fmtM(m.mttr.p85)} across ${m.mttr.count || 0} resolved problems.`,
      action:'Focus on recurring patterns that repeatedly drive the long resolution-time tail.',
      related:[...patterns].filter(pattern => pattern.avgDur > 0).sort((a, b) => b.avgDur - a.avgDur)[0] || null,
    },
  };
  const detail = execMetricDrilldown ? base[execMetricDrilldown] : null;
  if (!detail) {
    return `<section class="cx-metric-drilldown neutral">
      <div><div class="cx-eyebrow">Metric Drilldown</div><h2>${ps.length} problems reduced to ${patterns.length} recurring operational patterns</h2><p>Select a metric or pattern to inspect impact and recommended action.</p></div>
    </section>`;
  }
  const costAction = ['risk','recoverable'].includes(execMetricDrilldown)
    ? `<button class="snap-cta" data-action="toggleCfg">Cost assumptions</button>`
    : '';
  return `<section class="cx-metric-drilldown">
    <div class="cx-metric-main"><div class="cx-eyebrow">Metric Drilldown</div><h2>${detail.label}: ${detail.value}</h2><p>${detail.why}</p></div>
    <div class="cx-metric-context">
      ${detail.related ? `<div><span>Related top pattern</span><strong>${detail.related.title}</strong></div>` : ''}
      <div><span>Recommended next action</span><strong>${detail.action}</strong></div>
      ${costAction}
    </div>
  </section>`;
}

function renderConciseFocusBanner(patterns) {
  const ranked = [...patterns].map(pat => ({ pat, score: patternPriorityScore(pat, patterns) }))
    .sort((a, b) => b.score - a.score);
  const selected = execPatternSelectionMade
    ? patterns.find(p => p.id === patternExplorerState.selectedId) || null
    : null;
  if (!selected) {
    return `<section class="cx-focus neutral"><div><div class="cx-eyebrow">Pattern prioritization</div><h2>Select a pattern to inspect</h2><p>Select a pattern from the Act-First Map or Pattern Explorer to view impact, evidence, and remediation.</p></div></section>`;
  }
  const exposure = patternCost(selected);
  const recoverable = patternRecoverableValue(selected);
  const why = actFirstModel(selected, patterns).reason || highImpactReason(selected, patterns) || 'This recurring pattern represents measurable operational risk.';
  return `<section class="cx-focus">
    <div>
      <div class="cx-eyebrow">Selected pattern</div>
      <h2>${selected.title}</h2>
      <p>${selected.occurrences} occurrences | ${fmtC(exposure)} exposure | ${fmtC(recoverable)} recoverable | ${patternOpenCount(selected)} open</p>
      <div class="cx-focus-why">${why}</div>
    </div>
    <div class="cx-focus-actions">
      <button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${selected.id}">Get Remediation Path</button>
      <button class="snap-cta" data-action="focusPatternExplorer">Open Pattern Explorer</button>
    </div>
  </section>`;
}

function concisePatternStatus(pat) {
  if (!Object.prototype.hasOwnProperty.call(pat, 'status')) return null;
  return pat.status;
}

function renderConcisePatternTable(patterns) {
  const rows = getExplorerRows(patterns);
  const hasOwner = patterns.some(pat => Object.prototype.hasOwnProperty.call(pat, 'owner') || Object.prototype.hasOwnProperty.call(pat, 'ownerTeam'));
  const hasStatus = patterns.some(pat => concisePatternStatus(pat));
  const header = `
    <th>Priority</th><th>Pattern</th>${hasOwner?'<th>Owner</th>':''}<th>Occurrences</th><th>Exposure</th><th>Recoverable</th><th>Confidence%</th><th>Fixability</th><th>Trend</th><th>Priority score</th>${hasStatus?'<th>Status</th>':''}`;
  return `<section class="cx-table-card" id="patternExplorer">
    <div class="cx-section-head">
      <div><div class="cx-eyebrow">Pattern Explorer</div><h3>Which recurring issue should I fix next?</h3></div>
      <div class="cx-muted">${rows.length} matching pattern${rows.length!==1?'s':''}</div>
    </div>
    <div class="cx-table-wrap">
      <table class="cx-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${rows.map(({ pat, score }, idx) => {
          const services = patternServices(pat).slice(0, 2).join(', ');
          const rca = pat.dimensions?.rootCauseEntities?.[0] || pat.rcaLabel || 'RCA not consistently identified';
          return `<tr class="${execPatternSelectionMade && pat.id === patternExplorerState.selectedId ? 'selected' : ''}" data-action="selectPatternRow" data-pid="${pat.id}">
            <td><span class="px-priority">#${idx + 1}</span></td>
            <td><div class="cx-pat-name">${pat.title}</div><div class="cx-pat-meta">${services || 'Service not identified'} | ${rca}</div></td>
            ${hasOwner ? `<td>${pat.owner || pat.ownerTeam || ''}</td>` : ''}
            <td>${pat.occurrences}</td>
            <td>${fmtC(patternCost(pat))}</td>
            <td>${fmtC(patternRecoverableValue(pat))}</td>
            <td>${patternConfidenceScore(pat)}</td>
            <td><span class="exec-pat-chip ${pat.fixability === 'HIGH' ? 'fix-high' : pat.fixability === 'MEDIUM' ? 'fix-med' : 'fix-low'}">${pat.fixability}</span></td>
            <td><span class="exec-pat-chip ${pat.trend === 'INCREASING' ? 'trend-up' : pat.trend === 'DECREASING' ? 'trend-dn' : 'trend-stable'}">${pat.trend}</span></td>
            <td>${score}</td>
            ${hasStatus ? `<td>${concisePatternStatus(pat) || ''}</td>` : ''}
          </tr>`;
        }).join('') || `<tr><td colspan="${hasOwner && hasStatus ? 11 : hasOwner || hasStatus ? 10 : 9}"><div class="exec-empty">No patterns match the current filters.</div></td></tr>`}</tbody>
      </table>
    </div>
  </section>`;
}

function renderConciseDetailPanel(pat, patterns) {
  if (!pat) return `<aside class="cx-detail"><div class="exec-empty">Select a pattern to understand why it is recurring.</div></aside>`;
  const openCount = patternOpenCount(pat);
  const exposure = patternCost(pat);
  const recoverable = patternRecoverableValue(pat);
  const services = patternServices(pat);
  const entities = patternAffectedEntities(pat);
  const rcaList = pat.dimensions?.rootCauseEntities || [];
  const rcaConfidence = Math.round((pat.rcaConsistency || 0) * 100);
  const hasActionableRca = rcaList.length > 0 && rcaConfidence > 0;
  return `<aside class="cx-detail">
    <div class="cx-section-head compact">
      <div><div class="cx-eyebrow">Pattern Details</div><h3>${pat.title}</h3></div>
    </div>
    <div class="cx-detail-tiles">
      <div><strong>${pat.occurrences}</strong><span>Occurrences</span></div>
      <div><strong>${fmtC(exposure)}</strong><span>Exposure</span></div>
      <div><strong>${fmtC(recoverable)}</strong><span>Recoverable</span></div>
      <div><strong>${openCount}</strong><span>Open</span></div>
    </div>
    <div class="cx-detail-section">
      <div class="cx-eyebrow">Impacted entities</div>
      <div class="px-chip-list">
        ${services.slice(0, 8).map(s => `<span class="px-chip">Service: ${s}</span>`).join('') || '<span class="px-chip">Service not identified</span>'}
        ${(pat.problems || []).some(p => (p.users || 0) > 0) ? '<span class="px-chip">Customer-facing</span>' : ''}
        ${entities.slice(0, 6).map(e => `<span class="px-chip">${e}</span>`).join('')}
      </div>
    </div>
    <div class="cx-detail-section">
      <div class="cx-eyebrow">Evidence</div>
      <div class="px-evidence">
        <div class="px-evidence-row"><span>Recurrence</span><strong>${pat.occurrences} grouped incidents</strong></div>
        <div class="px-evidence-row"><span>Confidence</span><strong>${patternConfidenceScore(pat)} / 100 | RCA consistency ${rcaConfidence}%</strong></div>
        <div class="px-evidence-row"><span>Trend</span><strong>${pat.trend}</strong></div>
        <div class="px-evidence-row"><span>Cost</span><strong>${fmtC(exposure)} exposure | ${fmtC(recoverable)} recoverable</strong></div>
      </div>
    </div>
    ${renderInvestigationComplexityCard(pat, patterns)}
    <div class="cx-action-block ${hasActionableRca ? '' : 'low'}">
      <div class="cx-eyebrow">Root cause / recommended action</div>
      ${hasActionableRca
        ? `<strong>${rcaList.slice(0, 2).join(', ')}</strong><p>${pat.recommendation?.text || 'Use the existing remediation path to validate the corrective action before automation.'}</p><button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${pat.id}">Get Remediation Path</button>`
        : `<strong>RCA not consistently identified</strong><p>Consistency is ${rcaConfidence}%, so this should remain in investigation until the root cause is validated.</p>`}
    </div>
  </aside>`;
}

function executiveAffectedAreas(pat) {
  const ids = uniqVals((pat.problems || []).flatMap(p => p.affectedEntityIds || []));
  const count = pattern => ids.filter(id => pattern.test(String(id))).length;
  return { applications:count(/APPLICATION/i), synthetic:count(/SYNTHETIC/i), infrastructure:count(/HOST|PROCESS|CONTAINER|CLOUD|KUBERNETES/i), ids };
}

function renderExecDisclosure(title, summary, body) {
  return `<details class="cx-disclosure"><summary><span><strong>${title}</strong><small>${summary}</small></span><b>+</b></summary><div class="cx-disclosure-body">${body}</div></details>`;
}

function renderDecisionDetailPanel(pat, patterns) {
  if (!pat) return `<aside class="cx-detail cx-detail-empty"><div class="exec-empty">Select a pattern to see why it matters and what should be done next.</div></aside>`;
  const openCount = patternOpenCount(pat);
  const exposure = patternCost(pat);
  const recoverable = patternRecoverableValue(pat);
  const services = patternServices(pat);
  const entities = patternAffectedEntities(pat);
  const rcaList = pat.dimensions?.rootCauseEntities || [];
  const rcaConfidence = Math.round((pat.rcaConsistency || 0) * 100);
  const confidence = patternConfidenceScore(pat);
  const hasActionableRca = rcaList.length > 0 && rcaConfidence > 0;
  const totalExposure = patterns.reduce((sum, pattern) => sum + patternCost(pattern), 0);
  const exposureShare = totalExposure ? Math.round(exposure / totalExposure * 100) : 0;
  const affected = executiveAffectedAreas(pat);
  const complexity = buildInvestigationComplexity({ pattern:pat, toolRows:matchToolDetectionRowsToPattern(pat, TOOL_DETECTION_ROWS) });
  const resolved = (pat.problems || []).filter(p => p.status === 'RESOLVED' && p.dur);
  const avgMttr = resolved.length ? arrMean(resolved.map(p => p.dur)) : 0;
  const recommendedAction = hasActionableRca
    ? pat.recommendation?.text || 'Validate the identified root cause and initiate the remediation path.'
    : 'Continue investigation until the root cause is consistently identified.';
  const actionCount = remediationState.patternId === pat.id && Array.isArray(remediationState.response?.recommendations)
    ? remediationState.response.recommendations.length
    : hasActionableRca ? 1 : 0;
  const hasRemediation = remediationState.patternId === pat.id && remediationState.status === 'done';
  const remediationLoading = remediationState.patternId === pat.id && remediationState.status === 'loading';
  const remediationError = remediationState.patternId === pat.id && remediationState.status === 'error';
  const remediationResponse = hasRemediation ? remediationState.response : null;
  const remediationBody = hasRemediation ? renderAssistRemediationResponse(remediationResponse, remediationState.evidence) : '';
  const complexitySummary = `${complexity.evidenceFragmentation[0].toUpperCase() + complexity.evidenceFragmentation.slice(1)} complexity | ${complexity.signalSourceCount} signal sources | RCA confidence ${complexity.rcaConfidence}%`;
  const evidenceBody = `<div class="px-evidence"><div class="px-evidence-row"><span>Recurrence</span><strong>${pat.occurrences} grouped incidents</strong></div><div class="px-evidence-row"><span>Trend</span><strong>${pat.trend}</strong></div><div class="px-evidence-row"><span>MTTR</span><strong>${avgMttr ? fmtM(avgMttr) : 'No resolved duration data'}</strong></div><div class="px-evidence-row"><span>RCA confidence</span><strong>${rcaConfidence}%</strong></div><div class="px-evidence-row"><span>Signal quality</span><strong>${confidence} / 100 | concentration ${pat.concentration}</strong></div></div>`;
  const impactedBody = `<div class="px-chip-list">${services.map(s => `<span class="px-chip">Service: ${s}</span>`).join('') || '<span class="px-chip">No service entity</span>'}${entities.map(entity => `<span class="px-chip">${entity}</span>`).join('')}</div>`;
  const analysisBody = aiState === 'result' && lastAIResult
    ? `<div class="ai-compact"><div class="cx-eyebrow">Dynatrace Intelligence Analysis</div><p>${lastAIResult.summary || 'Analysis generated for the selected context.'}</p>${Array.isArray(lastAIResult.recommendations) ? `<ul>${lastAIResult.recommendations.slice(0,3).map(r => `<li>${typeof r === 'string' ? r : r.title || r.action || r.description || 'Recommended action'}</li>`).join('')}</ul>` : ''}</div>`
    : `<div class="cx-complexity-summary"><span>Analysis</span><strong>Available on request</strong><p>Use assisted analysis when leadership needs a concise business-risk explanation for this selected pattern.</p><button class="snap-cta" data-action="analyzeSelectedPattern" data-pid="${pat.id}">Generate Analysis</button></div>`;
  const remediationPanel = remediationLoading
    ? `<div class="cx-remediation-summary"><span>Generating remediation path from Dynatrace Assist...</span></div>`
    : remediationError
      ? `<div class="cx-remediation-summary"><strong>Remediation unavailable</strong><p>${remediationState.error || 'Dynatrace Assist is unavailable, try again.'}</p></div>`
      : hasRemediation
        ? remediationBody
        : `<div class="cx-remediation-summary"><strong>No remediation path generated yet</strong><p>Select Get Remediation Path to generate recommended next actions for this pattern.</p><button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${pat.id}">Get Remediation Path</button></div>`;
  const timelineBody = `<div class="px-evidence"><div class="px-evidence-row"><span>Occurrences</span><strong>${pat.occurrences}</strong></div><div class="px-evidence-row"><span>Trend</span><strong>${pat.trend}</strong></div><div class="px-evidence-row"><span>First seen</span><strong>${pat.firstSeen ? new Date(pat.firstSeen).toLocaleString() : 'Not available'}</strong></div><div class="px-evidence-row"><span>Last seen</span><strong>${pat.lastSeen ? new Date(pat.lastSeen).toLocaleString() : 'Not available'}</strong></div></div>`;
  return `<aside class="cx-detail">
    <div class="cx-section-head compact"><div><div class="cx-eyebrow">Pattern Details</div><h3>${pat.title}</h3></div></div>
    <div class="cx-exec-summary"><div class="cx-eyebrow">Executive Summary</div><p>${pat.title} is responsible for ${exposureShare}% of current pattern exposure. It has recurred ${pat.occurrences} times and currently has ${openCount} open incidents. Estimated recoverable value is ${fmtC(recoverable)}. Recommended action: ${recommendedAction}</p></div>
    <div class="cx-detail-label">Business Impact</div>
    <div class="cx-detail-tiles"><div><strong>${fmtC(exposure)}</strong><span>Exposure</span></div><div><strong>${fmtC(recoverable)}</strong><span>Recoverable</span></div><div><strong>${openCount}</strong><span>Open Incidents</span></div></div>
    <div class="cx-detail-label">Technical Actionability</div>
    <div class="cx-detail-tiles"><div><strong>${pat.fixability}</strong><span>Remediation Effort</span></div><div><strong>${confidence}/100</strong><span>Confidence</span></div><div><strong>${complexity.evidenceFragmentation}</strong><span>Investigation Friction</span></div></div>
    <div class="cx-complexity-summary"><span>Recurrence Timeline</span><strong>${pat.occurrences} occurrences | ${pat.trend}</strong>${timelineBody}</div>
    <div class="cx-action-block ${hasActionableRca ? '' : 'low'}"><div class="cx-eyebrow">Recommended Action</div><strong>${recommendedAction}</strong><div style="margin-top:8px"><button class="snap-cta rem" data-action="getPatternRemediation" data-pid="${pat.id}">Get Remediation Path</button></div></div>
    <div class="cx-complexity-summary"><span>Analysis</span>${analysisBody}</div>
    <div class="cx-complexity-summary"><span>Remediation</span>${remediationPanel}</div>
    <div class="cx-complexity-summary"><span>Investigation Complexity</span><strong>${complexitySummary}</strong><p>${complexity.narrative}</p></div>
    ${renderExecDisclosure('Impacted Entities', `${services.length} customer-facing services | ${affected.applications} applications | ${affected.synthetic} synthetic monitors | ${affected.infrastructure} infrastructure components`, impactedBody)}
    ${renderExecDisclosure('Raw Evidence', `${pat.occurrences} recurrences | ${pat.trend.toLowerCase()} | RCA confidence ${rcaConfidence}%`, evidenceBody)}
    ${renderExecDisclosure('Investigation Complexity', complexitySummary, renderInvestigationComplexityCard(pat, patterns) || `<p>${complexity.narrative}</p>`)}
    ${hasRemediation ? renderExecDisclosure('Remediation Path', `${actionCount} recommended actions | Estimated recovery ${fmtC(recoverable)}`, remediationBody) : ''}
  </aside>`;
}

function renderConciseActFirstMap(patterns) {
  const maxCost = Math.max(1, ...patterns.map(p => patternCost(p)));
  const ranked = [...patterns].map(pat => ({ pat, score: patternPriorityScore(pat, patterns) }))
    .sort((a, b) => b.score - a.score);
  const bubbles = ranked.map(({ pat, score }, idx) => {
    const cost = patternCost(pat);
    const recoverable = patternRecoverableValue(pat);
    const fixability = patternFixabilityScore(pat);
    const model = actFirstModel(pat, patterns);
    const costPosition = clamp(cost / maxCost, 0.06, 1);
    const left = Math.round(8 + fixability * 84);
    const bottom = Math.round(9 + costPosition * 80);
    const size = Math.round(clamp(18 + Math.sqrt(Math.max(0, cost)) / 60, 20, 48));
    const tooltip = `${pat.title} | Exposure ${fmtC(cost)} | Recoverable ${fmtC(recoverable)} | Fixability ${pat.fixability} | Priority ${score} | ${model.reason}`;
    return `<button class="cx-map-bubble ${execPatternSelectionMade && pat.id === patternExplorerState.selectedId ? 'selected' : ''}" data-action="selectPatternRow" data-pid="${pat.id}" data-tooltip="${attrText(tooltip)}" title="${attrText(tooltip)}" aria-label="${attrText(tooltip)}" style="left:${left}%;bottom:${bottom}%;width:${size}px;height:${size}px">#${idx + 1}</button>`;
  }).join('');
  return `<section class="cx-map">
    <div class="cx-section-head">
      <div><div class="cx-eyebrow">Act-First Map</div><h3>Cost exposure x fixability</h3><div class="cx-map-helper">Click a bubble to inspect the pattern.</div></div>
      <div class="cx-muted">Bubble size = exposure</div>
    </div>
    <div class="cx-map-plot">
      <div class="cx-map-axis y">Cost impact</div>
      <div class="cx-map-axis x">Fixability</div>
      <div class="cx-map-q q1">Do now</div><div class="cx-map-q q2">High cost-hard</div><div class="cx-map-q q3">Backlog</div><div class="cx-map-q q4">Quick win</div>
      ${bubbles}
    </div>
    <div class="cx-map-selection">${execPatternSelectionMade ? 'Selected pattern is highlighted. Review its impact and recurrence timeline below.' : 'Select a bubble to see pattern details.'}</div>
  </section>`;
}

function renderConciseExecView(patterns, ps) {
  const ranked = [...patterns].map(pat => ({ pat, score: patternPriorityScore(pat, patterns) })).sort((a, b) => b.score - a.score);
  if (!patternExplorerState.selectedId || !patterns.some(p => p.id === patternExplorerState.selectedId)) {
    patternExplorerState.selectedId = ranked[0]?.pat.id || null;
  }
  const selected = patterns.find(p => p.id === patternExplorerState.selectedId) || ranked[0]?.pat;
  document.getElementById('intelSummary').innerHTML = '';
  document.getElementById('patternGrid').innerHTML = `<div class="cx-view">
    ${renderConciseKpiRow(ps, patterns)}
    ${renderConciseFocusBanner(patterns)}
    <div class="cx-main-grid">
      <div class="cx-left">
        ${renderConciseActFirstMap(patterns)}
        ${renderConcisePatternTable(patterns)}
      </div>
      ${renderConciseDetailPanel(selected, patterns)}
    </div>
  </div>`;
}

function renderDecisionFirstExecView(patterns, ps) {
  const ranked = [...patterns].map(pat => ({ pat, score: patternPriorityScore(pat, patterns) })).sort((a, b) => b.score - a.score);
  const selected = execPatternSelectionMade
    ? patterns.find(p => p.id === patternExplorerState.selectedId) || null
    : null;
  const selectedView = execAnalyticalView === 'map' ? renderConciseActFirstMap(patterns) : renderConcisePatternTable(patterns);
  document.getElementById('intelSummary').innerHTML = '';
  document.getElementById('patternGrid').innerHTML = `<div class="cx-view cx-decision-view">
    ${renderConciseKpiRow(ps, patterns)}
    ${renderConciseFocusBanner(patterns)}
    <div class="cx-decision-workspace">
      <div class="cx-decision-main">
        <section class="cx-view-controls">
          <div><div class="cx-eyebrow">View Controls</div><span>Choose one prioritization view</span></div>
          <div class="cx-view-switch">
            <button class="${execAnalyticalView === 'explorer' ? 'active' : ''}" data-action="setExecAnalyticalView" data-mode="explorer">Pattern Explorer</button>
            <button class="${execAnalyticalView === 'map' ? 'active' : ''}" data-action="setExecAnalyticalView" data-mode="map">Act-First Map</button>
          </div>
        </section>
        <div class="cx-selected-view">${selectedView}</div>
      </div>
      ${selected ? renderDecisionDetailPanel(selected, patterns) : renderDecisionDetailPanel(null, patterns)}
    </div>
  </div>`;
}

function renderExecutivePatternView(patterns, ps) {
  {
    const totalProblems = ps.length;
    const patternOccurrences = patterns.reduce((s, pat) => s + pat.occurrences, 0);
    const oneOffCount = totalProblems - patternOccurrences;
    const actions = patterns.filter(pat => ['FIX_ROOT_CAUSE','ADD_TIME_WINDOW','INVESTIGATE_FIRST'].includes(pat.recommendation?.type)).length;
    const totalPatternCost = patterns.reduce((s, pat) => s + patternCost(pat), 0);
    const reductionPct = totalProblems ? Math.round((1 - (patterns.length / totalProblems)) * 100) : 0;
    const ranked = [...patterns].map(pat => ({ pat, score: patternPriorityScore(pat, patterns) }))
      .sort((a, b) => b.score - a.score);
    if (!patternExplorerState.selectedId || !patterns.some(p => p.id === patternExplorerState.selectedId)) {
      patternExplorerState.selectedId = ranked[0]?.pat.id || null;
    }
    const teams = patternFilterOptions(patterns, patternTeams);
    const services = patternFilterOptions(patterns, patternServices);
    const envs = patternFilterOptions(patterns, patternEnvironments);
    const rows = getExplorerRows(patterns);
    if (rows.length && !rows.some(r => r.pat.id === patternExplorerState.selectedId)) {
      patternExplorerState.selectedId = rows[0].pat.id;
    }
    const selected = patterns.find(p => p.id === patternExplorerState.selectedId) || rows[0]?.pat;
    const pageSize = 160;
    const offset = clamp(patternExplorerState.offset || 0, 0, Math.max(0, rows.length - pageSize));
    patternExplorerState.offset = offset;
    const visibleRows = rows.slice(offset, offset + pageSize);
    const sortMark = key => patternExplorerState.sort === key ? (patternExplorerState.dir === 'asc' ? ' up' : ' down') : '';
    const rowHtml = visibleRows.map(({ pat, score }, idx) => `
      <tr class="px-row ${pat.id === patternExplorerState.selectedId ? 'selected' : ''}" data-action="selectPatternRow" data-pid="${pat.id}">
        <td><span class="px-priority">#${idx + 1}</span></td>
        <td><div class="px-name">${pat.title}</div><div class="px-meta">${highImpactReason(pat, patterns) || 'recurring operational pattern'}</div></td>
        <td><span class="px-num">${pat.occurrences}</span></td>
        <td><span class="px-num">${fmtC(patternCost(pat))}</span></td>
        <td><span class="px-num">${patternOpenCount(pat)}</span></td>
        <td><span class="px-num">${patternConfidenceScore(pat)}</span></td>
        <td><span class="exec-pat-chip ${pat.fixability === 'HIGH' ? 'fix-high' : pat.fixability === 'MEDIUM' ? 'fix-med' : 'fix-low'}">${pat.fixability}</span></td>
        <td><span class="exec-pat-chip ${pat.trend === 'INCREASING' ? 'trend-up' : pat.trend === 'DECREASING' ? 'trend-dn' : 'trend-stable'}">${pat.trend[0] + pat.trend.slice(1).toLowerCase()}</span></td>
      </tr>`).join('');
    document.getElementById('patternGrid').innerHTML = `
      <div class="exec-board">
        <div class="pattern-lead">
          <div>
            <div class="pattern-lead-title">${totalProblems} problems reduced to <strong>${patterns.length} recurring patterns</strong></div>
            <div class="pattern-lead-sub">${patternOccurrences} grouped incidents | ${oneOffCount} one-off problems | ${reductionPct}% reduction in operational investigation scope</div>
          </div>
          <div class="pattern-lead-meta">
            <div class="pattern-mini-stat"><div class="pattern-mini-val">${fmtC(totalPatternCost)}</div><div class="pattern-mini-lbl">Pattern cost</div></div>
            <div class="pattern-mini-stat"><div class="pattern-mini-val">${actions}</div><div class="pattern-mini-lbl">Actions</div></div>
            <div class="pattern-mini-stat"><div class="pattern-mini-val">${ranked.filter(x => isHighImpactPattern(x.pat, patterns)).length}</div><div class="pattern-mini-lbl">High impact</div></div>
          </div>
        </div>

        <div class="pattern-funnel">
          <div class="funnel-step"><div class="funnel-lbl">Problems</div><div class="funnel-val">${totalProblems}</div><div class="funnel-sub">Non-duplicate Davis problems</div></div>
          <div class="funnel-step"><div class="funnel-lbl">Grouped Incidents</div><div class="funnel-val">${patternOccurrences}</div><div class="funnel-sub">${oneOffCount} excluded as one-off</div></div>
          <div class="funnel-step patterns"><div class="funnel-lbl">Patterns</div><div class="funnel-val">${patterns.length}</div><div class="funnel-sub">Recurring operational issues</div></div>
          <div class="funnel-step actions"><div class="funnel-lbl">Recommended Actions</div><div class="funnel-val">${actions}</div><div class="funnel-sub">Ranked by impact and recurrence</div></div>
        </div>

        ${renderActFirstMap(patterns)}

        <div class="pattern-explorer-shell">
          <div class="px-panel">
            <div class="px-toolbar">
              <input class="px-search" data-action="patternSearch" value="${patternExplorerState.search || ''}" placeholder="Search patterns, RCA, service, team">
              <select class="px-filter" data-action="patternFilter" data-filter="cost">${renderSelectOptions(['high','medium','low'], patternExplorerState.filters.cost, 'Cost')}</select>
              <select class="px-filter" data-action="patternFilter" data-filter="recurrence">${renderSelectOptions(['high','medium','low'], patternExplorerState.filters.recurrence, 'Recurrence')}</select>
              <select class="px-filter" data-action="patternFilter" data-filter="confidence">${renderSelectOptions(['high','medium','low'], patternExplorerState.filters.confidence, 'Confidence')}</select>
              <select class="px-filter" data-action="patternFilter" data-filter="team">${renderSelectOptions(teams, patternExplorerState.filters.team, 'Team')}</select>
              <select class="px-filter" data-action="patternFilter" data-filter="service">${renderSelectOptions(services, patternExplorerState.filters.service, 'Service')}</select>
              <select class="px-filter" data-action="patternFilter" data-filter="environment">${renderSelectOptions(envs, patternExplorerState.filters.environment, 'Environment')}</select>
            </div>
            <div class="px-table-wrap">
              <table class="px-table">
                <thead><tr>
                  <th data-action="sortPatternTable" data-sort="priority">Priority${sortMark('priority')}</th>
                  <th data-action="sortPatternTable" data-sort="name">Pattern Name${sortMark('name')}</th>
                  <th data-action="sortPatternTable" data-sort="occurrences">Occurrences${sortMark('occurrences')}</th>
                  <th data-action="sortPatternTable" data-sort="cost">Cost Impact${sortMark('cost')}</th>
                  <th data-action="sortPatternTable" data-sort="open">Open Incidents${sortMark('open')}</th>
                  <th data-action="sortPatternTable" data-sort="confidence">Confidence${sortMark('confidence')}</th>
                  <th data-action="sortPatternTable" data-sort="fixability">Fixability${sortMark('fixability')}</th>
                  <th data-action="sortPatternTable" data-sort="trend">Trend${sortMark('trend')}</th>
                </tr></thead>
                <tbody>${rowHtml || '<tr><td colspan="8"><div class="exec-empty">No patterns match the selected filters.</div></td></tr>'}</tbody>
              </table>
            </div>
            <div class="px-footer">
              <span>${rows.length} matching patterns | showing ${rows.length ? offset + 1 : 0}-${Math.min(offset + visibleRows.length, rows.length)}</span>
              <span>Sorted by ${patternExplorerState.sort}
                <button class="px-page-btn" data-action="pagePatternTable" data-dir="-1" ${offset <= 0 ? 'disabled' : ''}>Prev</button>
                <button class="px-page-btn" data-action="pagePatternTable" data-dir="1" ${offset + pageSize >= rows.length ? 'disabled' : ''}>Next</button>
              </span>
            </div>
          </div>
          <div class="px-panel">${renderPatternDetailPane(selected, patterns)}</div>
        </div>

        <div class="exec-t2-board">
          <div class="exec-t2-hdr">Pattern Explorer Notes</div>
          <div class="exec-empty">First screen: select the highest priority recurring issue. Second click: inspect timeline, entities, evidence, root-cause indicators, and recommended actions.</div>
        </div>
      </div>`;
    return;
  }
  const sm = calcSessionMetrics(ps, patterns);

  // Tier 1 financials
  const totalCost = ps.reduce((s, p) => s + calcCost(p).total, 0);
  const netPos    = sm.valueDeliveredTotal - totalCost;
  const netCls    = netPos >= 0 ? 'var(--green)' : 'var(--coral)';
  const netSign   = netPos >= 0 ? '+' : '-';
  const totalUsers = ps.reduce((s, p) => s + (p.users || 0), 0);

  // Tier 2: key drivers
  const topCostPat = [...patterns].sort((a, b) => {
    const ca = a.problems.reduce((s, p) => s + calcCost(p).total, 0);
    const cb = b.problems.reduce((s, p) => s + calcCost(p).total, 0);
    return cb - ca;
  })[0];
  const mostRecurring = [...patterns].sort((a, b) => b.occurrences - a.occurrences)[0];
  // Top services: aggregate problem count + cost by service name (from svcs[] array)
  const isIp = s => /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(s);
  const svcMap = new Map();
  ps.forEach(p => {
    const names = (p.svcs || []).filter(s => s && !isIp(s) && s.length < 60);
    const fallback = (!names.length) ? [p.rca || p.category || p.sev || 'Unknown'] : names;
    fallback.forEach(k => {
      if (!svcMap.has(k)) svcMap.set(k, { count: 0, cost: 0, openCount: 0 });
      const e = svcMap.get(k);
      e.count++;
      e.cost += calcCost(p).total;
      if (p.status === 'OPEN') e.openCount++;
    });
  });
  const topServices = [...svcMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);
  const topCostPatCost = topCostPat
    ? topCostPat.problems.reduce((s, p) => s + calcCost(p).total, 0) : 0;

  // Tech stack board
  const techMap = new Map();
  ps.forEach(p => {
    const infra = detectInfrastructure(p);
    const key   = infra.cloud || (infra.isK8s ? 'k8s' : 'onprem');
    const label = infra.cloud === 'aws' ? 'AWS' : infra.cloud === 'azure' ? 'Azure'
                : infra.cloud === 'gcp' ? 'GCP' : infra.isK8s ? 'Kubernetes' : 'On-premise';
    const icon  = infra.icon || '🐧';
    if (!techMap.has(key)) techMap.set(key, { key, label, icon, problems: [], cost: 0, openCount: 0 });
    const t = techMap.get(key);
    t.problems.push(p);
    t.cost += calcCost(p).total;
    if (p.status === 'OPEN') t.openCount++;
  });
  const techs = [...techMap.values()].map(t => {
    const resolved = t.problems.filter(p => p.status === 'RESOLVED' && (p.dur || 0) > 0);
    const avgMttr  = resolved.length
      ? Math.round(resolved.reduce((s, p) => s + (p.dur || 0), 0) / resolved.length) : null;
    const costConcentrationPct = totalCost > 0 ? Math.round(t.cost / totalCost * 100) : 0;
    return { ...t, avgMttr, costConcentrationPct };
  }).sort((a, b) => b.cost - a.cost);
  const withMttr = techs.filter(t => t.avgMttr != null);
  const maxMttr  = withMttr.length ? Math.max(...withMttr.map(t => t.avgMttr)) : 1;
  const minMttr  = withMttr.length ? Math.min(...withMttr.map(t => t.avgMttr)) : 0;
  const maxCost  = techs[0]?.cost || 1;
  // Tier 3: efficiency chips
  const chips = [];
  if (sm.mttrLift != null) {
    chips.push(`<div class="exec-chip"><span class="exec-chip-val">${sm.mttrLift}x</span><span class="exec-chip-lbl">MTTR lift with RCA</span></div>`);
  }
  chips.push(`<div class="exec-chip" title="Auto-correlated: % of problems where Davis AI identified a root cause entity - higher means less manual investigation"><span class="exec-chip-val">${Math.round(sm.autoCorrelationRate * 100)}%</span><span class="exec-chip-lbl">Auto-correlated</span></div>`);
  if (sm.avgQuality != null) {
    chips.push(`<div class="exec-chip" title="Pattern Quality Score (0–100): how reliably Davis can identify this as a real repeating problem vs random noise. Combines: how similar incident titles are (35%), how consistently the same root cause is found (35%), how regular the timing is (15%), and how predictable the cost is each time (15%)."><span class="exec-chip-val">${sm.avgQuality}</span><span class="exec-chip-lbl">Avg pattern quality</span></div>`);
  }
  if (sm.lowConfCount > 0) {
    chips.push(`<div class="exec-chip exec-chip-warn" title="Patterns with quality score below 50 - inconsistent RCA, irregular recurrence, or mixed entity cluster. Treat costs for these patterns as indicative, not precise."><span class="exec-chip-val">${sm.lowConfCount}</span><span class="exec-chip-lbl">Low-confidence patterns</span></div>`);
  }
  chips.push(`<div class="exec-chip" title="Events suppressed: estimated alert noise eliminated by Davis AI pattern grouping. Each grouped problem saves ~8 separate alert notifications."><span class="exec-chip-val">${sm.estimatedEventsSuppressed}</span><span class="exec-chip-lbl">Events suppressed</span></div>`);

  // ── System Direction ──
  const dirMeta = {
    IMPROVING: { cls: 'dir-improving', icon: 'up', label: 'Improving',  sub: `Cost ${sm.costTrend.toLowerCase()}, recurrence ${sm.recurrenceTrend.toLowerCase()}, MTTR ${sm.mttrTrend.toLowerCase()}` },
    STABLE:    { cls: 'dir-stable',    icon: '->', label: 'Stable',     sub: `Cost ${sm.costTrend.toLowerCase()}, recurrence ${sm.recurrenceTrend.toLowerCase()}, MTTR ${sm.mttrTrend.toLowerCase()}` },
    DEGRADING: { cls: 'dir-degrading', icon: 'down', label: 'Degrading',  sub: `Cost ${sm.costTrend.toLowerCase()}, recurrence ${sm.recurrenceTrend.toLowerCase()}, MTTR ${sm.mttrTrend.toLowerCase()}` },
  };
  const dir = dirMeta[sm.systemDirection];

  // ── Value breakdown percentages ──
  const vTotal = sm.valueDeliveredTotal || 1;
  const mttrPct  = Math.round(sm.valueBreakdown.mttrSavings / vTotal * 100);
  const noisePct = Math.round(sm.valueBreakdown.noiseReductionSavings / vTotal * 100);
  const aiPct    = Math.round(sm.valueBreakdown.aiCorrelationSavings / vTotal * 100);
  const confBadge = renderConfidenceBadge(confidenceLevel(sm.avgCostConf));

  // ── Tech cost concentration ──
  const topTech     = techs[0];
  const topTechPct  = totalCost > 0 && topTech ? Math.round(topTech.cost / totalCost * 100) : 0;
  const techInsight = topTech && topTechPct > 0
    ? `<div class="exec-tech-insight">${topTech.label} accounts for ${topTechPct}% of operational cost.</div>` : '';

  const techRowsWithPct = techs.map(t => {
    const isSlowest = withMttr.length > 1 && t.avgMttr === maxMttr;
    const isFastest = withMttr.length > 1 && t.avgMttr === minMttr;
    const mttrBarW  = maxMttr > 0 && t.avgMttr != null ? Math.round(t.avgMttr / maxMttr * 100) : 0;
    const costBarW  = Math.round(t.cost / maxCost * 100);
    const costPct   = t.costConcentrationPct;
    const mttrCls   = isSlowest ? 'slowest' : isFastest ? 'fastest' : '';
    const openPart  = t.openCount > 0
      ? `<span class="exec-tech-open">${t.openCount} open</span>` : '';
    const badgePart = isSlowest ? `<span class="exec-tech-badge slowest">⏱ Slowest</span>`
                    : isFastest ? `<span class="exec-tech-badge fastest">Lightning Fastest</span>` : '';
    return `<div class="exec-tech-row">
      <span class="exec-tech-icon">${t.icon}</span>
      <span class="exec-tech-label">${t.label}</span>
      <div class="exec-tech-count-cell">
        <span class="exec-tech-count">${t.problems.length}</span>
        <span class="exec-tech-unit">problems</span>
        ${openPart}
      </div>
      <div class="exec-tech-cost-cell">
        <span class="exec-tech-cost">${fmtC(t.cost)}</span>
        <span class="exec-tech-pct">${costPct}%</span>
        <div class="exec-tech-bar-wrap"><div class="exec-tech-cost-bar" style="width:${costBarW}%"></div></div>
      </div>
      <div class="exec-tech-mttr-cell">
        ${t.avgMttr != null ? `
          <div class="exec-tech-bar-wrap"><div class="exec-tech-mttr-bar ${mttrCls}" style="width:${mttrBarW}%"></div></div>
          <span class="exec-tech-mttr-val ${mttrCls}">${fmtM(t.avgMttr)}</span>
          ${badgePart}
        ` : `<span class="exec-tech-na">No MTTR data</span>`}
      </div>
    </div>`;
  }).join('');

  // ── Key drivers with pattern metadata ──
  const TREND_ICON  = { INCREASING: 'up', STABLE: '->', DECREASING: 'down' };
  const TREND_CLS   = { INCREASING: 'trend-up', STABLE: 'trend-stable', DECREASING: 'trend-dn' };
  const FIX_CLS     = { HIGH: 'fix-high', MEDIUM: 'fix-med', LOW: 'fix-low', High: 'fix-high', Medium: 'fix-med', Low: 'fix-low' };
  const CONC_CLS    = { HIGH: 'conc-high', MEDIUM: 'conc-med', LOW: 'conc-low', High: 'conc-high', Medium: 'conc-med', Low: 'conc-low' };

  const TREND_TOOLTIP = {
    INCREASING: 'Trend: rate in second half of period is >30% higher than first half - pattern is worsening',
    STABLE:     'Trend: occurrence rate is consistent across the period (within ±30%)',
    DECREASING: 'Trend: rate in second half is >30% lower than first half - pattern is improving',
  };
  const CONC_TOOLTIP = 'Concentration: how tightly all incidents in this pattern point to a single component. High = every occurrence implicates the same entity and costs roughly the same amount - easy to locate and fix. Low = incidents are spread across multiple components or vary widely in cost.';
  const FIX_TOOLTIP  = 'Fixability: how likely a single engineering action can permanently resolve this pattern. High = Davis identified a consistent root cause, the pattern repeats on a stable schedule, and incidents cluster tightly on one component. Low = root cause varies or is unknown, making a permanent fix harder.';

  const driverRow = (badge, badgeCls, pat, valHtml, metaHtml) => `
    <div class="exec-t2-row">
      <span class="exec-t2-badge ${badgeCls}">${badge}</span>
      <span class="exec-t2-name" title="${pat.title}">${pat.title}</span>
      <div class="exec-t2-chips">
        <span class="exec-pat-chip ${TREND_CLS[pat.trend]}" title="${TREND_TOOLTIP[pat.trend]}">${TREND_ICON[pat.trend]} ${pat.trend[0]+pat.trend.slice(1).toLowerCase()}</span>
        ${isHighImpactPattern(pat, patterns) ? `<span class="exec-pat-chip trend-up" title="High impact: ${highImpactReason(pat, patterns)}">Impact: High</span>` : ''}
        <span class="exec-pat-chip ${CONC_CLS[pat.concentration]}" title="${CONC_TOOLTIP}">Conc: ${pat.concentration}</span>
        <span class="exec-pat-chip ${FIX_CLS[pat.fixability]}" title="${FIX_TOOLTIP}">Fix: ${pat.fixability}</span>
        ${renderConfidenceBadge(pat.confidence, 'pattern')}
      </div>
      <span class="exec-t2-val">${valHtml}</span>
      <span class="exec-t2-meta">${metaHtml}</span>
    </div>
    `;

  const patternRow = pat => {
    const openCount = pat.problems.filter(p => p.status === 'OPEN').length;
    const cost = pat.problems.reduce((s, p) => s + calcCost(p).total, 0);
    const d = pat.dimensions || {};
    return `<div class="exec-t2-row exec-pattern-row">
      <span class="exec-t2-badge exec-t2-pattern">Pattern</span>
      <span class="exec-t2-name" title="${pat.title}">${pat.title}</span>
      <div class="exec-t2-chips">
        <span class="exec-pat-chip ${TREND_CLS[pat.trend]}" title="${TREND_TOOLTIP[pat.trend]}">${TREND_ICON[pat.trend]} ${pat.trend[0]+pat.trend.slice(1).toLowerCase()}</span>
        <span class="exec-pat-chip ${CONC_CLS[pat.concentration]}" title="${CONC_TOOLTIP}">Conc: ${pat.concentration}</span>
        <span class="exec-pat-chip ${FIX_CLS[pat.fixability]}" title="${FIX_TOOLTIP}">Fix: ${pat.fixability}</span>
        ${d.primaryRootCause ? `<span class="exec-pat-chip exec-dim-chip">RCA: ${d.primaryRootCause}</span>` : ''}
      </div>
      <span class="exec-t2-val">${pat.occurrences}x</span>
      <span class="exec-t2-meta">${fmtC(cost)}${openCount ? ` | ${openCount} open` : ''}</span>
      <button class="exec-detail-btn ${expandedPatterns.has(pat.id) ? 'open' : ''}" data-action="togglePatternExpand" data-pid="${pat.id}">
        ${expandedPatterns.has(pat.id) ? 'Hide' : 'Details'}
      </button>
    </div>
    ${expandedPatterns.has(pat.id) ? renderExecutivePatternDetail(pat) : ''}`;
  };

  const patternOccurrences = patterns.reduce((s, pat) => s + pat.occurrences, 0);
  const patternsBoard = execPatternsOpen ? `<div class="exec-t2-board exec-patterns-board">
    <div class="exec-t2-hdr">Patterns | ${patterns.length} patterns | ${patternOccurrences} pattern occurrences | ${fmtC(patterns.reduce((s, pat) => s + pat.totalCost, 0))} pattern cost</div>
    <div class="exec-patterns-list">${patterns.map(patternRow).join('')}</div>
  </div>` : '';

  document.getElementById('patternGrid').innerHTML = `
    <div class="exec-board">

      <!-- System Direction -->
      <div class="exec-direction ${dir.cls}">
        <span class="exec-dir-icon">${dir.icon}</span>
        <div class="exec-dir-body">
          <span class="exec-dir-label">System Direction: ${dir.label}</span>
          <span class="exec-dir-sub">${dir.sub}</span>
        </div>
      </div>

      <!-- Change Over Time strip -->
      <div class="exec-change-strip">
        <div class="exec-change-item">
          <span class="exec-change-icon ${sm.costTrendUp ? 'trend-up' : 'trend-dn'}">${sm.costTrendUp ? 'up' : 'down'}</span>
          <span class="exec-change-lbl">Cost trend</span>
        </div>
        <div class="exec-change-item">
          <span class="exec-change-icon ${sm.mttrTrendUp ? 'trend-up' : 'trend-dn'}">${sm.mttrTrendUp ? 'up' : 'down'}</span>
          <span class="exec-change-lbl">MTTR trend</span>
        </div>
        <div class="exec-change-item">
          <span class="exec-change-num">${sm.newPatterns}</span>
          <span class="exec-change-lbl">New patterns detected</span>
        </div>
        <div class="exec-change-item">
          <span class="exec-change-num ${sm.resolvedPats > 0 ? 'trend-dn-good' : ''}">${sm.resolvedPats}</span>
          <span class="exec-change-lbl">Patterns resolved</span>
        </div>
      </div>

      <!-- Tier 1: Financial KPIs -->
      <div class="exec-kpi-row">
        <div class="exec-kpi-card">
          <div class="exec-kpi-lbl-row">
            <span class="exec-kpi-lbl">Value Delivered</span>
            ${confBadge}
          </div>
          <div class="exec-kpi-big" style="color:var(--green)">${fmtC(sm.valueDeliveredTotal)}</div>
          <button class="exec-value-toggle ${execValueBreakdownOpen ? 'open' : ''}" data-action="toggleExecValueBreakdown">
            <span>${execValueBreakdownOpen ? 'Hide' : 'Show'} savings breakdown</span>
            <span class="exec-value-toggle-ic">›</span>
          </button>
          <div class="exec-value-breakdown ${execValueBreakdownOpen ? '' : 'hidden'}">
            <div class="exec-vb-row">
              <span class="exec-vb-icon">⏱</span>
              <span class="exec-vb-lbl">MTTR Reduction Savings</span>
              <span class="exec-vb-amt">${fmtC(sm.valueBreakdown.mttrSavings)}</span>
              <span class="exec-vb-pct">${mttrPct}%</span>
            </div>
            <div class="exec-vb-row">
              <span class="exec-vb-icon">🤖</span>
              <span class="exec-vb-lbl">AI Correlation Savings</span>
              <span class="exec-vb-amt">${fmtC(sm.valueBreakdown.aiCorrelationSavings)}</span>
              <span class="exec-vb-pct">${aiPct}%</span>
            </div>
            <div class="exec-vb-row">
              <span class="exec-vb-icon">🔕</span>
              <span class="exec-vb-lbl">Noise Reduction Savings</span>
              <span class="exec-vb-amt">${fmtC(sm.valueBreakdown.noiseReductionSavings)}</span>
              <span class="exec-vb-pct">${noisePct}%</span>
            </div>
          </div>
        </div>
        <div class="exec-kpi-card">
          <div class="exec-kpi-lbl">Operational Cost</div>
          <div class="exec-kpi-big">${fmtC(totalCost)}</div>
          <div class="exec-kpi-sub">${ps.length} problems | ${totalUsers.toLocaleString()} users affected</div>
        </div>
        <div class="exec-kpi-card">
          <div class="exec-kpi-lbl">Efficiency Delta</div>
          <div class="exec-kpi-big" style="color:${netCls}">${netSign}${fmtC(Math.abs(netPos))}</div>
          <div class="exec-kpi-sub exec-kpi-modeled">Estimated operational efficiency gain (modeled)</div>
        </div>
      </div>

      <!-- Key Drivers -->
      <div class="exec-t2-board">
        <div class="exec-t2-hdr">Key Drivers</div>
        ${topCostPat ? driverRow('Top cost', 'exec-t2-cost', topCostPat, fmtC(topCostPatCost), `${topCostPat.occurrences}x recurrence`) : ''}
        ${mostRecurring && mostRecurring !== topCostPat
          ? driverRow('Most recurring', 'exec-t2-recur', mostRecurring,
              `${mostRecurring.occurrences}x`,
              fmtC(mostRecurring.problems.reduce((s,p)=>s+calcCost(p).total,0)))
          : ''}
        ${topServices.map(([svc, data], i) => `<div class="exec-t2-row">
          <span class="exec-t2-badge exec-t2-entity">${i === 0 ? 'Top service' : `#${i+1} service`}</span>
          <span class="exec-t2-name" title="${svc}">${svc}</span>
          <div class="exec-t2-chips">
            ${data.openCount > 0 ? `<span class="exec-pat-chip trend-up">${data.openCount} open</span>` : ''}
          </div>
          <span class="exec-t2-val">${data.count} problems</span>
          <span class="exec-t2-meta">${fmtC(data.cost)}</span>
        </div>`).join('')}
      </div>

      <!-- Technology Breakdown -->
      <div class="exec-tech-board">
        ${techInsight}
        <div class="exec-tech-hdr-row">
          <span></span><span>Technology</span><span>Problems</span>
          <span>Est. Impact</span><span>Avg Resolution Time</span>
        </div>
        ${techRowsWithPct}
      </div>

      <!-- Tier 3: Efficiency Chips -->
      <div class="exec-t3-row">
        ${chips.join('')}
      </div>

    </div>`;
}

function buildSparkline(sparkData) {
  if (!sparkData || sparkData.length < 2) return '';
  const W = 300, H = 30;
  const vals = sparkData.map(d => d.v);
  const maxV = Math.max(...vals) || 1;
  const minV = 0;
  const pts = sparkData.map((d, i) => {
    const x = (i / (sparkData.length - 1)) * W;
    const y = H - ((d.v - minV) / (maxV - minV)) * H;
    return `${x},${y}`;
  }).join(' ');
  const areaBottom = `${W},${H} 0,${H}`;
  return `<div class="pc-spark">
    <svg class="spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg-${sparkData[0]?.t}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(77,184,255,.25)"/>
          <stop offset="100%" stop-color="rgba(77,184,255,.01)"/>
        </linearGradient>
      </defs>
      <polygon points="${pts} ${areaBottom}" fill="url(#sg-${sparkData[0]?.t})"/>
      <polyline points="${pts}" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-linejoin="round"/>
      ${sparkData.map((d, i) => {
        const x = (i / (sparkData.length - 1)) * W;
        const y = H - ((d.v - minV) / (maxV - minV)) * H;
        return `<circle cx="${x}" cy="${y}" r="2.5" fill="var(--blue)" stroke="var(--bg-1)" stroke-width="1.5"/>`;
      }).join('')}
    </svg>
  </div>`;
}

function renderOneOffs(oneOffs) {
  const el = document.getElementById('oneoffsSection');
  if (!oneOffs.length) { el.innerHTML = ''; return; }
  const isOpen = el.classList.contains('open');
  el.innerHTML = `
    <div class="oneoffs-header" data-action="toggleOneOffs">
      <span style="font-size:14px">📄</span>
      <span class="oneoffs-title">One-off Problems - no recurring pattern detected</span>
      <span class="oneoffs-sub">${oneOffs.length} individual incidents | ${fmtC(oneOffs.reduce((s, p) => s + calcCost(p).total, 0))} combined cost</span>
      <span class="oneoffs-toggle ${isOpen ? 'open' : ''}">></span>
    </div>
    <div class="oneoffs-list" style="display:${isOpen ? '' : 'none'}" id="oneoffsList">
      ${oneOffs.map(p => {
        const c = calcCost(p);
        return `<div class="oneoff-row">
          <span class="sdot ${p.status}"></span>
          <span class="sev ${p.sev} oneoff-sev" style="font-size:9px">${SEV_LBL[p.sev]}</span>
          <span class="oneoff-title">${persona === 'executive' ? p.biz : p.title}</span>
          <span class="oneoff-cost">${fmtC(c.total)}</span>
          <span class="oneoff-time">${fmtR(p.start)}</span>
          <span class="lbtn" data-action="drillToExplorer" data-pid="${p.id}">↗</span>
        </div>`;
      }).join('')}
    </div>`;
}

function toggleOneOffs() {
  const el = document.getElementById('oneoffsSection');
  const list = document.getElementById('oneoffsList');
  const toggle = el.querySelector('.oneoffs-toggle');
  const isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : '';
  toggle.classList.toggle('open', !isOpen);
  el.classList.toggle('open', !isOpen);
}

function togglePatternExpand(id) {
  if (expandedPatterns.has(id)) expandedPatterns.delete(id);
  else expandedPatterns.add(id);
  if (persona === 'executive' && execKpiDetail) render();
  else renderPatternIntelligence();
}

function togglePatternActions(id) {
  if (expandedActions.has(id)) expandedActions.delete(id);
  else expandedActions.add(id);
  renderPatternIntelligence();
}

function drillIntoPattern(patId) {
  // Switch to explorer and highlight the pattern's problems
  switchView('explorer');
  // The explorer renders all - user can see individual problems there
}

function patternAction(action, patId) {
  const msgs = {
    suppress: '🔕 Alert suppression rule created in Dynatrace.\nProblems matching this pattern will no longer page on-call.',
    window:   '⏱ Time-based suppression window configured.\nAlert will be muted during the detected cluster window.',
    threshold:'📉 Alert tuning ticket created.\nSend to your Dynatrace admin to adjust threshold settings.',
    fix:      '🔁 Root cause fix ticket created and assigned to the owning team.\nProblem linked to engineering backlog.',
    debug:    'Lightning Live Debugger armed.\nNext occurrence of this pattern will automatically capture a production snapshot.',
    tune:     '📊 Alert frequency tuning ticket created.\nReview evaluation window and consecutive breach settings.',
    ticket:   'Ticket Engineering ticket created in Jira.\nPattern details, cost impact, and recommendation attached.',
  };
  alert(msgs[action] || 'Action triggered: ' + action);
}


// ══════════════════════════════════════════
// TEAM PROGRESS - RECORD KEEPING
// ServiceNow ticket refs + pattern history
// ══════════════════════════════════════════

// ── Mock weekly snapshots (production: stored as Dynatrace Business Events) ──
// fetch bizevents | filter event.type == "opint.weekly_snapshot" | sort timestamp asc
const WEEKLY_SNAPSHOTS = [
  { week:'Apr 7',  totalProblems:22, avgMTTR:82, recurringCount:12, missingRCA:43, estimatedCost:89400, noisyAlerts:8  },
  { week:'Apr 14', totalProblems:20, avgMTTR:76, recurringCount:11, missingRCA:39, estimatedCost:81200, noisyAlerts:7  },
  { week:'Apr 21', totalProblems:19, avgMTTR:71, recurringCount:10, missingRCA:34, estimatedCost:74800, noisyAlerts:6  },
  { week:'Apr 28', totalProblems:18, avgMTTR:65, recurringCount:8,  missingRCA:29, estimatedCost:63100, noisyAlerts:5  },
  { week:'May 5',  totalProblems:17, avgMTTR:61, recurringCount:7,  missingRCA:24, estimatedCost:58700, noisyAlerts:4  },
  { week:'May 12', totalProblems:16, avgMTTR:55, recurringCount:6,  missingRCA:21, estimatedCost:49200, noisyAlerts:3  },
  { week:'May 19', totalProblems:15, avgMTTR:51, recurringCount:5,  missingRCA:18, estimatedCost:41800, noisyAlerts:2  },
  { week:'May 27', totalProblems:20, avgMTTR:48, recurringCount:5,  missingRCA:18, estimatedCost:38600, noisyAlerts:2  },
];

// ── Mock pattern history with ServiceNow ticket references ──
// Production: pulled from Dynatrace Problems API linkedTickets field
// DQL: fetch dt.davis.problems | fields problemId = event.id, title = event.name, status = event.status
const PATTERN_HISTORY = [
  {
    id: 'ph-checkout',
    title: 'Checkout Experience Degraded',
    technicalTitle: 'Response time degradation on /api/checkout',
    firstFlagged: Date.now() - 50 * 86400000,   // 50 days ago
    severity: 'PERFORMANCE',
    recommendation: 'FIX_ROOT_CAUSE',
    // ServiceNow ticket - from Dynatrace linkedTickets[]
    // In production: problem.linkedTickets[0].ticketId
    ticket: {
      id: 'INC0044102',
      url: 'https://your-instance.service-now.com/incident/INC0044102',
      status: 'in_progress',   // open | in_progress | resolved | closed
      assignee: 'James T.',
      team: 'Platform Engineering',
      openedAt: Date.now() - 6 * 86400000,
      resolvedAt: null,
    },
    // Weekly occurrence counts - production: derived from DQL pattern grouping per week
    occurrencesByWeek: [2, 3, 3, 2, 3, 2, 2, 3],
    costByWeek: [7200, 8400, 7800, 6900, 8100, 7200, 6800, 8100],
    isRegressed: false,
    rca: 'checkout-service',
  },
  {
    id: 'ph-payment',
    title: 'Payment Processing Failures',
    technicalTitle: 'High failure rate on payment-gateway service',
    firstFlagged: Date.now() - 50 * 86400000,
    severity: 'ERROR',
    recommendation: 'FIX_ROOT_CAUSE',
    ticket: {
      id: 'INC0043821',
      url: 'https://your-instance.service-now.com/incident/INC0043821',
      status: 'in_progress',
      assignee: 'Arun M.',
      team: 'Payments Engineering',
      openedAt: Date.now() - 21 * 86400000,
      resolvedAt: null,
    },
    occurrencesByWeek: [3, 3, 3, 2, 3, 3, 2, 3],
    costByWeek: [38000, 41000, 36000, 29000, 38000, 35000, 32000, 38000],
    isRegressed: false,
    rca: 'payments-db',
  },
  {
    id: 'ph-inventory',
    title: 'Inventory CPU Spikes',
    technicalTitle: 'CPU spike on inventory-service pod',
    firstFlagged: Date.now() - 42 * 86400000,
    severity: 'RESOURCE_CONTENTION',
    recommendation: 'INVESTIGATE_FIRST',
    ticket: {
      id: 'INC0043955',
      url: 'https://your-instance.service-now.com/incident/INC0043955',
      status: 'resolved',
      assignee: 'Sarah K.',
      team: 'Platform Engineering',
      openedAt: Date.now() - 35 * 86400000,
      resolvedAt: Date.now() - 14 * 86400000,
    },
    occurrencesByWeek: [4, 4, 3, 2, 1, 0, 0, 0],
    costByWeek: [564, 564, 423, 282, 141, 0, 0, 0],
    isRegressed: false,
    rca: 'inventory-service',
  },
  {
    id: 'ph-session',
    title: 'User Session Interruption',
    technicalTitle: 'Container OOMKilled: session-service',
    firstFlagged: Date.now() - 35 * 86400000,
    severity: 'AVAILABILITY',
    recommendation: 'INVESTIGATE_FIRST',
    ticket: null,    // ← No ServiceNow ticket found - UNACTIONED
    occurrencesByWeek: [0, 2, 1, 2, 2, 1, 2, 2],
    costByWeek: [0, 4800, 2400, 4800, 4800, 2400, 4800, 4800],
    isRegressed: false,
    rca: null,
  },
  {
    id: 'ph-catalog',
    title: 'Product Search Performance Impact',
    technicalTitle: 'Slow database queries: product-catalog-db',
    firstFlagged: Date.now() - 56 * 86400000,
    severity: 'PERFORMANCE',
    recommendation: 'FIX_ROOT_CAUSE',
    ticket: {
      id: 'INC0043310',
      url: 'https://your-instance.service-now.com/incident/INC0043310',
      status: 'resolved',
      assignee: 'Priya S.',
      team: 'Catalog Engineering',
      openedAt: Date.now() - 49 * 86400000,
      resolvedAt: Date.now() - 21 * 86400000,
    },
    occurrencesByWeek: [2, 2, 1, 0, 0, 0, 0, 0],
    costByWeek: [8200, 8200, 4100, 0, 0, 0, 0, 0],
    // Regression: ticket closed but pattern returned
    isRegressed: false,
    rca: 'product-catalog-db',
  },
  {
    id: 'ph-auth',
    title: 'Login & Authentication Outage',
    technicalTitle: 'Service unavailability: auth-service',
    firstFlagged: Date.now() - 28 * 86400000,
    severity: 'AVAILABILITY',
    recommendation: 'FIX_ROOT_CAUSE',
    ticket: {
      id: 'INC0044089',
      url: 'https://your-instance.service-now.com/incident/INC0044089',
      status: 'closed',
      assignee: 'James T.',
      team: 'Auth Engineering',
      openedAt: Date.now() - 28 * 86400000,
      resolvedAt: Date.now() - 7 * 86400000,
    },
    occurrencesByWeek: [1, 0, 0, 1, 0, 0, 0, 1],
    costByWeek: [28000, 0, 0, 28000, 0, 0, 0, 28000],
    // Ticket closed but firing again - REGRESSION
    isRegressed: true,
    rca: 'auth-service',
  },
];

// ── State ──
let progressExpandedIds = new Set();
let activeMetrics = new Set(['avgMTTR', 'recurringCount', 'estimatedCost', 'missingRCA']);

// ── Derive pattern status from ticket state + occurrence data ──
function getPatternStatus(ph) {
  const recentOccs = ph.occurrencesByWeek.slice(-2).reduce((a, b) => a + b, 0);
  if (ph.isRegressed) return 'regressed';
  if (!ph.ticket) return 'unactioned';
  if (ph.ticket.status === 'resolved' || ph.ticket.status === 'closed') {
    return recentOccs === 0 ? 'resolved' : 'regressed';
  }
  // Ticket open/in-progress
  const daysOpen = Math.floor((Date.now() - ph.ticket.openedAt) / 86400000);
  if (daysOpen >= 14 && recentOccs > 0) return 'stalled';
  return 'ticketed';
}

// ── Cost of inaction ──
function calcCostOfInaction(ph) {
  // If ticket exists: cost since ticket opened; else cost since first flagged
  const sinceMs = ph.ticket ? ph.ticket.openedAt : ph.firstFlagged;
  const weeksElapsed = Math.ceil((Date.now() - sinceMs) / (7 * 86400000));
  const relevantWeeks = ph.costByWeek.slice(-Math.min(weeksElapsed, ph.costByWeek.length));
  return relevantWeeks.reduce((a, b) => a + b, 0);
}

// ── Cost saved (for resolved patterns) ──
function calcCostSaved(ph) {
  if (!ph.ticket?.resolvedAt) return 0;
  const avgWeeklyCost = ph.costByWeek.filter(c => c > 0).reduce((a, b) => a + b, 0) /
    (ph.costByWeek.filter(c => c > 0).length || 1);
  const weeksSinceResolved = Math.floor((Date.now() - ph.ticket.resolvedAt) / (7 * 86400000));
  return Math.round(avgWeeklyCost * weeksSinceResolved);
}

// ── Main render ──
function renderProgress() {
  const snap = WEEKLY_SNAPSHOTS;
  const first = snap[0], last = snap[snap.length - 1];

  // Compute deltas (first -> last week)
  const delta = (key, invert = false) => {
    const d = ((last[key] - first[key]) / first[key]) * 100;
    const improving = invert ? d < 0 : d < 0;
    return { pct: Math.abs(Math.round(d)), improving, direction: d < 0 ? 'down' : d > 0 ? 'up' : '->' };
  };

  const unactionedCount = PATTERN_HISTORY.filter(ph => !ph.ticket).length;
  const stalledCount    = PATTERN_HISTORY.filter(ph => getPatternStatus(ph) === 'stalled').length;
  const regressedCount  = PATTERN_HISTORY.filter(ph => ph.isRegressed || getPatternStatus(ph) === 'regressed').length;
  document.getElementById('progressTabCount').textContent =
    (unactionedCount + stalledCount + regressedCount) > 0
      ? `${unactionedCount + stalledCount + regressedCount} Warning`
      : PATTERN_HISTORY.length;

  document.getElementById('progressContent').innerHTML = `
    ${renderHealthTrend(snap, first, last, delta)}
    ${renderMetricPills(last, delta)}
    ${renderPatternPersistence()}
  `;

  // Draw SVG chart after DOM ready
  requestAnimationFrame(() => drawTrendChart(snap));
}

// ── Health trend chart ──
function renderHealthTrend(snap, first, last, delta) {
  return `
    <div class="prog-section">
      <div class="prog-section-title">Operational Health Trend - 8 weeks</div>
      <div class="trend-card">
        <div class="trend-card-header">
          <div>
            <div class="trend-card-title">Week-on-week operational metrics</div>
            <div class="trend-card-sub">Click legend items to toggle metrics</div>
          </div>
          <div class="trend-legend">
            ${[
              { key:'avgMTTR',        label:'Avg MTTR',      color:'#4db8ff' },
              { key:'recurringCount', label:'Recurring',     color:'#ff6b6b' },
              { key:'estimatedCost',  label:'Est. Cost',     color:'#f5c518' },
              { key:'missingRCA',     label:'Missing RCA %', color:'#9b8fe4' },
              { key:'noisyAlerts',    label:'Noisy Alerts',  color:'#3dd68c' },
            ].map(m => `
              <div class="tl-item ${activeMetrics.has(m.key) ? '' : 'inactive'}"
                   data-action="toggleMetric" data-key="${m.key}" style="${activeMetrics.has(m.key) ? '' : 'opacity:.35'}">
                <div class="tl-dot" style="background:${m.color}"></div>
                ${m.label}
              </div>`).join('')}
          </div>
        </div>
        <div class="trend-chart-wrap">
          <svg class="trend-svg" id="healthTrendSvg" viewBox="0 0 800 160" preserveAspectRatio="none"></svg>
        </div>
      </div>
    </div>`;
}

function drawTrendChart(snap) {
  const svg = document.getElementById('healthTrendSvg');
  if (!svg) return;
  const W = 800, H = 140, PAD = { t: 10, b: 28, l: 0, r: 0 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const n = snap.length;

  const METRICS = [
    { key:'avgMTTR',        color:'#4db8ff', label:'MTTR'    },
    { key:'recurringCount', color:'#ff6b6b', label:'Recurring'},
    { key:'estimatedCost',  color:'#f5c518', label:'Cost'    },
    { key:'missingRCA',     color:'#9b8fe4', label:'RCA %'   },
    { key:'noisyAlerts',    color:'#3dd68c', label:'Noisy'   },
  ].filter(m => activeMetrics.has(m.key));

  let html = `<defs>`;
  METRICS.forEach(m => {
    const vals = snap.map(s => s[m.key]);
    const mn = 0, mx = Math.max(...vals) * 1.15 || 1;
    const rgb = m.color.replace('#','');
    const r = parseInt(rgb.slice(0,2),16), g = parseInt(rgb.slice(2,4),16), b = parseInt(rgb.slice(4,6),16);
    html += `<linearGradient id="grad-${m.key}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(${r},${g},${b},.2)"/>
      <stop offset="100%" stop-color="rgba(${r},${g},${b},.01)"/>
    </linearGradient>`;
  });
  html += `</defs>`;

  // Grid lines
  for (let i = 0; i <= 3; i++) {
    const y = PAD.t + (i / 3) * cH;
    html += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
  }

  // X labels
  snap.forEach((s, i) => {
    const x = PAD.l + (i / (n - 1)) * cW;
    if (i % 2 === 0 || i === n - 1) {
      html += `<text x="${x}" y="${H - 4}" text-anchor="middle" fill="rgba(90,115,145,.9)" font-size="9" font-family="'Space Grotesk',sans-serif">${s.week}</text>`;
    }
  });

  // Lines per active metric (normalised 0–1 each)
  METRICS.forEach(m => {
    const vals = snap.map(s => s[m.key]);
    const mn = 0, mx = Math.max(...vals) * 1.15 || 1;
    const x = i => PAD.l + (i / (n - 1)) * cW;
    const y = v => PAD.t + cH - ((v - mn) / (mx - mn)) * cH;
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const areaPts = `${pts} ${x(n-1)},${PAD.t + cH} ${x(0)},${PAD.t + cH}`;
    html += `<polygon points="${areaPts}" fill="url(#grad-${m.key})"/>`;
    html += `<polyline points="${pts}" fill="none" stroke="${m.color}" stroke-width="2" stroke-linejoin="round" opacity=".9"/>`;
    // Last point dot
    const lx = x(n-1), ly = y(vals[n-1]);
    html += `<circle cx="${lx}" cy="${ly}" r="4" fill="${m.color}" stroke="var(--bg-1)" stroke-width="2"/>`;
    html += `<text x="${lx + 6}" y="${ly + 4}" fill="${m.color}" font-size="9" font-family="'Space Grotesk',sans-serif">${m.label}</text>`;
  });

  svg.innerHTML = html;
}

function toggleMetric(key) {
  if (activeMetrics.has(key)) activeMetrics.delete(key);
  else activeMetrics.add(key);
  renderProgress();
}

// ── Metric pills ──
function renderMetricPills(last, delta) {
  const PILLS = [
    { key:'avgMTTR',        label:'Avg MTTR',      val: fmtM(last.avgMTTR),               color:'var(--blue)',   accent:'rgba(77,184,255,.15)',  delta: delta('avgMTTR', true),  invertGood: true  },
    { key:'recurringCount', label:'Recurring Issues',val: last.recurringCount,             color:'var(--coral)',  accent:'rgba(255,107,107,.12)', delta: delta('recurringCount', true), invertGood: true },
    { key:'estimatedCost',  label:'Weekly Cost',    val: fmtC(last.estimatedCost),         color:'var(--amber)',  accent:'rgba(245,197,24,.1)',   delta: delta('estimatedCost', true),  invertGood: true },
    { key:'missingRCA',     label:'Missing RCA',    val: last.missingRCA + '%',            color:'var(--violet)', accent:'rgba(155,143,228,.12)',delta: delta('missingRCA', true),      invertGood: true },
    { key:'noisyAlerts',    label:'Noisy Alerts',   val: last.noisyAlerts,                 color:'var(--green)',  accent:'rgba(61,214,140,.1)',   delta: delta('noisyAlerts', true),    invertGood: true },
  ];
  const dCls = d => d.improving ? 'good' : d.pct === 0 ? 'flat' : 'bad';
  const dTxt = d => `${d.direction} ${d.pct}% vs 8w ago`;
  return `
    <div class="metric-pills">
      ${PILLS.map(p => `
        <div class="metric-pill" style="border-color:${p.color}22">
          <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:${p.color}"></div>
          <div class="mp-val" style="color:${p.color}">${p.val}</div>
          <div class="mp-lbl">${p.label}</div>
          <div class="mp-delta ${dCls(p.delta)}">${dTxt(p.delta)}</div>
        </div>`).join('')}
    </div>`;
}

// ── Pattern Persistence ──
function renderPatternPersistence() {
  const STATUS_META = {
    ticketed:   { label: 'Ticketed',   dotCls: 'ticketed',   cardCls: ''           },
    stalled:    { label: 'Stalled Warning', dotCls: 'stalled',    cardCls: 'stalled'    },
    resolved:   { label: 'Resolved',   dotCls: 'resolved',   cardCls: ''           },
    regressed:  { label: 'Regressed 🔴',dotCls:'regressed',  cardCls: 'regressed'  },
    unactioned: { label: 'No Ticket Warning',dotCls:'unactioned',  cardCls: 'unactioned' },
  };

  const TICKET_STATUS_CLS = { open:'open', in_progress:'progress', resolved:'resolved', closed:'resolved' };
  const TICKET_STATUS_LBL = { open:'Open', in_progress:'In Progress', resolved:'Resolved', closed:'Closed' };

  const REC_META_LOCAL = {
    ADD_TIME_WINDOW:   '⏱ Add Time Window',
    FIX_ROOT_CAUSE:    '🔁 Fix Root Cause',
    INVESTIGATE_FIRST: '🔍 Investigate First',
  };

  const cards = PATTERN_HISTORY.map(ph => {
    const status = getPatternStatus(ph);
    const sm = STATUS_META[status] || STATUS_META.ticketed;
    const coi = calcCostOfInaction(ph);
    const saved = calcCostSaved(ph);
    const isExpanded = progressExpandedIds.has(ph.id);
    const daysOpen = ph.ticket ? Math.floor((Date.now() - ph.ticket.openedAt) / 86400000) : null;
    const daysSinceFirst = Math.floor((Date.now() - ph.firstFlagged) / 86400000);
    const ageCls = daysOpen === null ? '' : daysOpen < 7 ? 'fresh' : daysOpen < 14 ? 'aging' : 'old';
    const totalOccs = ph.occurrencesByWeek.reduce((a, b) => a + b, 0);

    // Ticket badge
    const ticketHtml = ph.ticket
      ? `<span class="ticket-badge ${TICKET_STATUS_CLS[ph.ticket.status] || 'open'}"
           data-action="openTicket" data-url="${ph.ticket.url}" title="Open in ServiceNow">
           Ticket ${ph.ticket.id} | ${TICKET_STATUS_LBL[ph.ticket.status] || ph.ticket.status}
         </span>`
      : `<span class="ticket-badge none">Ticket No ticket found</span>`;

    const ageHtml = daysOpen !== null
      ? `<span class="age-badge ${ageCls}">⏱ ${daysOpen}d open</span>`
      : '';

    // Expanded detail
    const detailHtml = isExpanded ? `
      <div class="pc2-detail">
        <div class="pc2-detail-grid">
          <div class="pc2-detail-block">
            <div class="pc2-detail-lbl">Occurrence Trend - 8 weeks</div>
            ${buildOccurrenceTimeline(ph.occurrencesByWeek, WEEKLY_SNAPSHOTS.map(s => s.week))}
          </div>
          <div class="pc2-detail-block">
            <div class="pc2-detail-lbl">Cost Breakdown</div>
            <div class="coi-breakdown">
              <div class="coi-row"><span>Total occurrences</span><strong>${totalOccs}x</strong></div>
              <div class="coi-row"><span>First flagged</span><strong>${daysSinceFirst}d ago</strong></div>
              ${ph.ticket ? `
              <div class="coi-row"><span>Assigned to</span><strong>${ph.ticket.assignee || '-'}</strong></div>
              <div class="coi-row"><span>Team</span><strong>${ph.ticket.team || '-'}</strong></div>
              ` : '<div class="coi-row"><span style="color:var(--amber)">Warning No owner assigned</span></div>'}
              ${status === 'resolved' || status === 'regressed' ? `
              <div class="coi-row" style="margin-top:4px;padding-top:4px;border-top:1px solid var(--border)"><span>Est. cost saved</span><strong style="color:var(--green)">${fmtC(saved)}/wk</strong></div>
              ` : `
              <div class="coi-row" style="margin-top:4px;padding-top:4px;border-top:1px solid var(--border)"><span>${ph.ticket ? 'Cost since ticket opened' : 'Cost since first flagged'}</span><strong style="color:var(--coral)">${fmtC(coi)}</strong></div>
              `}
            </div>
          </div>
        </div>
        ${ph.isRegressed || status === 'regressed' ? `
        <div class="regression-alert">
          🔴 <strong>Regression detected</strong> - ServiceNow ticket ${ph.ticket?.id || ''} was closed but this pattern has returned. Root fix did not hold.
        </div>` : ''}
        <div style="margin-top:10px;font-size:11px;color:var(--text-3)">
          <strong style="color:var(--text-2)">OpInt recommendation:</strong> ${REC_META_LOCAL[ph.recommendation] || ph.recommendation}
          ${ph.rca ? ` | Root cause: <span style="font-family:var(--mono);color:var(--text-2)">${ph.rca}</span>` : ' | Root cause not identified'}
        </div>
      </div>` : '';

    return `
      <div class="persist-card ${sm.cardCls}">
        <div class="pc2-header" data-action="toggleProgressExpand" data-pid="${ph.id}">
          <div class="pc2-status-dot ${sm.dotCls}"></div>
          <div class="pc2-info">
            <div class="pc2-title">${ph.title}</div>
            <div class="pc2-meta">
              ${ticketHtml}
              ${ageHtml}
              <span style="font-size:10px;color:var(--text-3)">${daysSinceFirst}d since first flagged</span>
              ${status === 'unactioned' ? `<span style="font-size:10px;color:var(--amber);font-weight:600">Warning No action recorded</span>` : ''}
              ${status === 'stalled' ? `<span style="font-size:10px;color:var(--orange);font-weight:600">Warning Ticket open ${daysOpen}d - still recurring</span>` : ''}
            </div>
          </div>
          <div class="pc2-right">
            ${status === 'resolved' ? `
            <div class="pc2-cost-inaction" style="text-align:right">
              <div class="pc2-cost-val" style="color:var(--green)">${fmtC(saved)}</div>
              <div class="pc2-cost-lbl">saved / week</div>
            </div>` : `
            <div class="pc2-cost-inaction">
              <div class="pc2-cost-val">${fmtC(coi)}</div>
              <div class="pc2-cost-lbl">${ph.ticket ? 'since ticket opened' : 'since first flagged'}</div>
            </div>`}
            <span class="pc2-expand-btn ${isExpanded ? 'open' : ''}">></span>
          </div>
        </div>
        ${detailHtml}
      </div>`;
  }).join('');

  return `
    <div class="prog-section">
      <div class="prog-section-title">Pattern History & ServiceNow References</div>
      <div class="persist-list">${cards}</div>
    </div>`;
}

function buildOccurrenceTimeline(occsByWeek, weekLabels) {
  const maxOcc = Math.max(...occsByWeek, 1);
  const bars = occsByWeek.map((count, i) => {
    const hPct = Math.max(8, Math.round((count / maxOcc) * 100));
    const col = count === 0 ? 'var(--bg-3)'
      : count <= 1 ? 'var(--green)'
      : count <= 2 ? 'var(--amber)'
      : 'var(--coral)';
    return `<div class="occ-bar" style="height:${hPct}%;background:${col}"
      title="${weekLabels[i]||''}: ${count} occurrence${count!==1?'s':''}"></div>`;
  }).join('');
  return `<div class="occ-timeline">${bars}</div>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span style="font-size:9px;color:var(--text-3)">${weekLabels[0]||''}</span>
      <span style="font-size:9px;color:var(--text-3)">${weekLabels[weekLabels.length-1]||''}</span>
    </div>`;
}

function toggleProgressExpand(id) {
  if (progressExpandedIds.has(id)) progressExpandedIds.delete(id);
  else progressExpandedIds.add(id);
  renderProgress();
  requestAnimationFrame(() => drawTrendChart(WEEKLY_SNAPSHOTS));
}

function openTicket(url) {
  alert('Opening ServiceNow ticket:\n' + url + '\n\nIn production: navigates directly to your ServiceNow instance.');
}


// ── UTILS ──
function switchPersona(p){
  persona=p;selectedIds.clear();expandedIds.clear();aiState='idle';lastAIResult=null;
  execKpiDetail=null;
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
  document.documentElement.style.setProperty('--persona',PMETA[p].color);
  render();renderAIPanel(null);renderRemPanel();
}
function renderCostAssumptionsText() {
  const el = document.getElementById('cfgAssumptions');
  if (!el) return;
  el.textContent = `${activeCostProfile} profile: severity factors are ${Object.entries(costModel.severityMultipliers || {}).map(([k,v]) => `${k} ${v}`).join(', ')}; engineer rate ${fmtC(costModel.engineerHourlyRate || 0)}/hr; responders ${costModel.defaultResponders || 0}; affected user cost ${fmtC(costModel.affectedUserCostPerHour || 0)}/hr; recovery rate ${Math.round(recoveryRate()*100)}%.`;
}
function syncCostConfigPanel() {
  const profile = document.getElementById('cfgProfile');
  const rev = document.getElementById('cfgRev');
  const eng = document.getElementById('cfgEng');
  const resp = document.getElementById('cfgResp');
  const recovery = document.getElementById('cfgRecovery');
  if (profile) profile.value = activeCostProfile;
  if (rev) rev.value = ((costModel.affectedUserCostPerHour || 0) / 60).toFixed(2);
  if (eng) eng.value = String(costModel.engineerHourlyRate || 0);
  if (resp) resp.value = String(costModel.defaultResponders || 0);
  if (recovery) recovery.value = String(Math.round(recoveryRate()*100));
  renderCostAssumptionsText();
}
function toggleCfg(){syncCostConfigPanel();document.getElementById('cfgPanel').classList.toggle('hidden')}
function applyCfg(){
  const profileName = document.getElementById('cfgProfile')?.value || 'Standard';
  applyCostModelProfile(profileName);
  const revPerMinute = parseFloat(document.getElementById('cfgRev').value);
  const engRate = parseFloat(document.getElementById('cfgEng').value);
  const responders = parseInt(document.getElementById('cfgResp').value);
  const recoveryPct = parseFloat(document.getElementById('cfgRecovery')?.value);
  costModel.affectedUserCostPerHour = Number.isFinite(revPerMinute) ? Math.max(0, revPerMinute) * 60 : costModel.affectedUserCostPerHour;
  costModel.engineerHourlyRate = Number.isFinite(engRate) ? Math.max(0, engRate) : costModel.engineerHourlyRate;
  costModel.defaultResponders = Number.isFinite(responders) ? Math.max(1, responders) : costModel.defaultResponders;
  costModel.recoveryRate = Number.isFinite(recoveryPct) ? clamp(recoveryPct / 100, 0, 1) : costModel.recoveryRate;
  syncLegacyCostConfig();
  document.getElementById('cfgPanel').classList.add('hidden');
  render();
}
function doRefresh(){const b=document.querySelector('[data-action="doRefresh"]');if(b){b.textContent='Refreshing...';b.disabled=true;}loadProblems().finally(()=>{render();if(b){b.textContent='Refresh';b.disabled=false;}});}
function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type:'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
async function downloadDqlNotebook() {
  const fallback = `# OpInt DQL Validation Notebook

The full validation notebook is maintained in the project at:

docs/opint-dql-validation-notebook.md

Use it to validate:
- DQL query inventory and expected fields
- Persona and KPI consumers
- Client-side transformations
- Pattern grouping assumptions
- Median MTTR and empty-state handling
- Edge cases for no/open/resolved/mixed problems

This lightweight runtime export is intentionally additive and does not change app calculations.
`;
  try {
    const res = await fetch('docs/opint-dql-validation-notebook.md', { cache:'no-store' });
    if (!res.ok) throw new Error(`Notebook fetch failed: ${res.status}`);
    const text = await res.text();
    downloadTextFile('opint-dql-validation-notebook.md', text || fallback);
  } catch (err) {
    console.info('[OpInt] DQL validation notebook fetch unavailable; downloading access note instead.', err.message || err);
    downloadTextFile('opint-dql-validation-notebook-access.md', fallback);
  }
}
function openP(id){alert(`Opens Dynatrace problem:\nhttps://your-tenant.apps.dynatrace.com/ui/problems/${id}`)}
document.addEventListener('click',e=>{const p=document.getElementById('cfgPanel');if(!p.classList.contains('hidden')&&!p.contains(e.target)&&!e.target.classList.contains('cb-cfg'))p.classList.add('hidden')});

// ============================================================
// EVENT DELEGATION - replaces all inline onclick handlers
// ============================================================
document.addEventListener('click', function(e) {
  // Stop propagation for containers marked with data-stop-propagation
  if (e.target.closest('[data-stop-propagation]')) {
    const container = e.target.closest('[data-stop-propagation]');
    if (container !== e.target && !e.target.dataset.action) { e.stopPropagation(); return; }
  }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const pid = el.dataset.pid;
  const key = el.dataset.key;

  switch (action) {
    // Header / persona
    case 'doRefresh': doRefresh(); break;
    case 'downloadDqlNotebook': downloadDqlNotebook(); break;
    case 'toggleCfg': toggleCfg(); break;
    case 'applyCfg': applyCfg(); break;
    case 'analyzeMulti': analyzeMulti(); break;
    case 'closeAwsModal': closeAwsModal(); break;

    // Problem table
    case 'toggleExpand': e.stopPropagation(); toggleExpand(pid, e); break;
    case 'openP': e.stopPropagation(); openP(pid); break;
    case 'onRowClick': onRowClick(pid); break;
    case 'deepAnalyze': e.stopPropagation(); deepAnalyze(pid); break;
    case 'extTriage': e.stopPropagation(); extTriage(pid); break;
    case 'showRemPanel': e.stopPropagation(); showRemPanel(pid); break;

    // Remediation action (opt.id encoded in data-opt)
    case 'remAction': {
      const optId = el.dataset.opt;
      if (optId === 'aws-agent') showRemPanel(pid);
      else if (optId === 'live-debugger') activateLiveDebugger(pid);
      else if (optId === 'dt-workflows') openDTWorkflows(pid);
      else if (optId === 'manual') openP(pid);
      else alert('Triggering: ' + optId);
      break;
    }

    // AWS modal confirm
    case 'triggerAgent': triggerAgent(pid, el.dataset.agent); break;

    // Persona buttons (data-p already on elements)
    case undefined: break;

    // Pattern intelligence
    case 'togglePatternExpand': togglePatternExpand(pid); break;
    case 'togglePatternActions': e.stopPropagation(); togglePatternActions(pid); break;
    case 'patternAction': patternAction(el.dataset.type, pid); break;
    case 'drillIntoPattern': drillIntoPattern(pid); break;
    case 'drillToExplorer': e.stopPropagation(); switchView('explorer'); onRowClick(pid); break;
    case 'toggleOneOffs': toggleOneOffs(); break;
    case 'toggleExecValueBreakdown': e.stopPropagation(); toggleExecValueBreakdown(); break;
    case 'toggleExecPatterns': e.stopPropagation(); toggleExecPatterns(); break;
    case 'toggleExecKpiDetail': e.stopPropagation(); toggleExecKpiDetail(el.dataset.mode); break;
    case 'selectPatternRow': e.stopPropagation(); selectPatternRow(pid); break;
    case 'focusPatternExplorer': e.stopPropagation(); focusPatternExplorer(); break;
    case 'getPatternRemediation': e.stopPropagation(); if (pid) getPatternRemediation(pid); break;
    case 'setExecAnalyticalView': e.stopPropagation(); setExecAnalyticalView(el.dataset.mode); break;
    case 'selectExecMetric': e.stopPropagation(); selectExecMetric(el.dataset.metric); break;
    case 'openPatternAnalysis':
      e.stopPropagation();
      document.getElementById('aiCard')?.closest('details')?.setAttribute('open', '');
      if (pid) deepAnalyze(pid);
      break;
    case 'analyzeSelectedPattern': e.stopPropagation(); if (pid) analyzePattern(pid); break;
    case 'sortPatternTable': e.stopPropagation(); sortPatternTable(el.dataset.sort); break;
    case 'pagePatternTable': e.stopPropagation(); pagePatternTable(Number(el.dataset.dir || 1)); break;

    // Trend chart legend
    case 'toggleMetric': toggleMetric(key); break;

    // Team progress
    case 'toggleProgressExpand': toggleProgressExpand(pid); break;
    case 'openTicket': e.stopPropagation(); openTicket(el.dataset.url); break;
  }
});

// Persona buttons use data-p (existing attribute)
document.getElementById('psw').addEventListener('click', function(e) {
  const btn = e.target.closest('.pbtn');
  if (btn) switchPersona(btn.dataset.p);
});

// View tabs use data-view (existing attribute)
document.querySelector('.view-tabs').addEventListener('click', function(e) {
  const tab = e.target.closest('.view-tab');
  if (tab) switchView(tab.dataset.view);
});

// AI source buttons use data-src (existing attribute)
document.querySelector('.ai-src-bar').addEventListener('click', function(e) {
  const btn = e.target.closest('.ai-src-btn');
  if (btn) switchAISrc(btn.dataset.src);
});

// Select change listeners
document.getElementById('appFilter').addEventListener('change', render);
document.getElementById('timeRange').addEventListener('change', () => { PROBLEMS = MOCK_PROBLEMS; MTTR_SUMMARY = null; render(); loadProblems(); });
document.getElementById('extProvider').addEventListener('change', onProviderChange);

// Modal overlay: close only when clicking the overlay itself
document.getElementById('awsModal').addEventListener('click', function(e) {
  if (e.target === this) closeAwsModal();
});

// Checkbox change delegation (toggleSel uses checked state)
document.addEventListener('change', function(e) {
  const cb = e.target.closest('.rc[data-action="toggleSel"]');
  if (cb) { e.stopPropagation(); toggleSel(cb.dataset.pid, cb.checked, e); }
  const pf = e.target.closest('[data-action="patternFilter"]');
  if (pf) { e.stopPropagation(); setPatternFilter(pf.dataset.filter, pf.value); }
});

document.addEventListener('input', function(e) {
  const ps = e.target.closest('[data-action="patternSearch"]');
  if (ps) {
    e.stopPropagation();
    clearTimeout(patternSearchTimer);
    const value = ps.value;
    patternSearchTimer = setTimeout(() => setPatternSearch(value), 180);
  }
});

document.addEventListener('keydown', function(e) {
  const card = e.target.closest('.kcard[role="button"][data-action="toggleExecKpiDetail"]');
  if (!card) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleExecKpiDetail(card.dataset.mode);
  }
});

// BOOT - render immediately with demo data, then replace with live Grail data
document.addEventListener('keydown', function(e) {
  const bubble = e.target.closest('.act-map-bubble[data-act-map="1"]');
  if (!bubble) return;
  const bubbles = [...document.querySelectorAll('.act-map-bubble[data-act-map="1"]')];
  const idx = bubbles.indexOf(bubble);
  if (idx < 0) return;
  if (['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)) {
    e.preventDefault();
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = bubbles[(idx + dir + bubbles.length) % bubbles.length];
    if (next?.dataset.pid) {
      selectPatternRow(next.dataset.pid, { remediate:false });
      setTimeout(() => document.querySelector(`.act-map-bubble[data-pid="${next.dataset.pid}"]`)?.focus(), 0);
    }
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (bubble.dataset.pid) getPatternRemediation(bubble.dataset.pid);
  }
});

render();
switchView('patterns');
loadProblems();
export {};

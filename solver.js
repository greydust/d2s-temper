/** Stochastic shortest path, with successful temper count n and chosen-line hits h, capped at the target.
 * Completion requires 10 successful tempers, with at least target hits.
 * Failed attempts self-loop; eliminating that loop costs 1/p(n)=1+n/4.
 * A regenerative-cycle reward formulation avoids cancellation for rare targets.
 */
export function solve(lineCount, target) {
  if (!Number.isInteger(lineCount) || lineCount < 1 || lineCount > 64 || !Number.isInteger(target) || target < 1 || target > 10) throw new RangeError('Choose 1–64 lines and 1–10 target rolls.');
  const p=1/lineCount;
  const evaluate=(budget,keep=false)=>{
    const v=Array.from({length:11},()=>Array(target+1).fill(budget));
    const policy=Array.from({length:11},()=>Array(target+1).fill('done'));
    for(let n=10;n>=0;n--)for(let h=0;h<=Math.min(n,target);h++){
      if(n===10&&h===target)continue;
      let value=-1,action='clean';
      if(n<10){const gain=-(1+n/4)+p*v[n+1][Math.min(target,h+1)]+(1-p)*v[n+1][h];if(n===0||gain>=value-1e-11){value=gain;action='temper';}}
      v[n][h]=value;policy[n][h]=action;
    }
    return keep?{v,policy}:v[0][0];
  };
  let lo=0,hi=1;
  while(evaluate(hi)<0)hi*=2;
  for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(evaluate(mid)<0)lo=mid;else hi=mid;}
  const cost=(lo+hi)/2;
  const {policy}=evaluate(cost,true);
  const memo=new Map();
  const cycle=(n,h)=>{
    if(n===10&&h>=target)return {success:1,attempts:0,cleans:0};
    const key=n+','+h;if(memo.has(key))return memo.get(key);
    if(policy[n][h]==='clean')return {success:0,attempts:0,cleans:1};
    const a=cycle(n+1,Math.min(target,h+1)),b=cycle(n+1,h);
    const out={success:p*a.success+(1-p)*b.success,attempts:1+n/4+p*a.attempts+(1-p)*b.attempts,cleans:p*a.cleans+(1-p)*b.cleans};memo.set(key,out);return out;
  };
  const stats=cycle(0,0);
  const thresholds=lineCount===1?[]:Array.from({length:10},(_,i)=>{const n=i+1;const valid=Array.from({length:Math.min(n,target)+1},(_,h)=>h).filter(h=>policy[n][h]==='temper');return {n,min:valid.length?Math.min(...valid):null};});
  return {lineCount,target,cost,policy,thresholds,success:stats.success,attempts:stats.attempts/stats.success,cleans:stats.cleans/stats.success};
}

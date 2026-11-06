/* Relational storage transport; native document/BI formats and local backups stay compatible. */
(function(root){
 'use strict';
 const formats={markdown:'md-editor-workspace',insight:'insight-bi-workspace'};
 function validate(app,w){if(!formats[app]||!w||w.format!==formats[app]||w.version!==1||Array.isArray(w))throw Error('작업공간 형식을 확인해 주세요.');if(new Blob([JSON.stringify(w)]).size>100*1024*1024)throw Error('클라우드 작업공간은 최대 100MB입니다.');return w}
 function create(client,authenticated){
  const check=app=>{if(!authenticated())throw Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');if(!formats[app])throw Error('지원하지 않는 애플리케이션입니다.')};
  function failure(e){const x=Error(e?.code==='PT409'?'다른 기기에서 저장본이 바뀌었습니다. 다시 불러와 비교해 주세요.':e?.code==='42501'||e?.code==='PGRST301'?'저장 권한 또는 로그인을 확인해 주세요.':e?.code==='PGRST202'?'관계형 저장소 설정이 필요합니다.':['22023','23514','23503','23505'].includes(e?.code)?'문서·폴더 또는 데이터 연결 구조와 용량을 확인해 주세요.':e?.message||'클라우드 저장에 실패했습니다.');x.code=e?.code;x.conflict=e?.code==='PT409';return x}
  async function user(){const {data,error}=await client.auth.getUser();if(error||!data?.user?.id)throw Error('로그인을 다시 확인해 주세요.');return data.user.id}
  async function call(app,operation,args={}){check(app);const uid=await user();const {data,error}=await client.rpc('portal_content_workspace_'+operation,{p_app:app,...args});if(error)throw failure(error);check(app);if(await user()!==uid)throw Error('로그인 계정이 바뀌었습니다. 다시 시도해 주세요.');return data}
  return {info:app=>call(app,'info'),load:async app=>{const result=await call(app,'get');if(result.hasWorkspace)validate(app,result.workspace);return result},save:async(app,w,expected)=>{check(app);validate(app,w);return call(app,'save',{p_workspace:w,p_expected:expected??null})}}
 }
 const api={create,validate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PortalContentCloud=api;
})(typeof globalThis!=='undefined'?globalThis:this);

/** Dependency-injected publication orchestration; no public secrets or mock live writes. */
import {transitionContent,contentPath} from './content-workflow.mjs';
export async function publishReviewedContent({item,actor,expectedRevision,storage,deployer,authorize}={}){
 if(!item||item.status!=='review')throw new Error('Only reviewed content may publish');
 if(item.revision!==expectedRevision)throw new Error('Revision conflict');
 if(typeof actor!=='string'||!actor.trim())throw new Error('Authenticated actor required');
 if(typeof authorize!=='function'||!(await authorize(actor,'content.publish',item)))throw new Error('Publication denied');
 if(typeof storage?.saveRevision!=='function'||typeof deployer?.publish!=='function')throw new Error('Secure storage and deploy adapters required');
 const published=transitionContent(item,'published',{authorized:true});
 const saved=await storage.saveRevision({item:published,expectedRevision,actor});
 if(!saved||saved.ok!==true)throw new Error('Content persistence failed; deployment blocked');
 const deployed=await deployer.publish({path:contentPath(published),revision:published.revision,locale:published.locale});
 if(!deployed||deployed.ok!==true)throw new Error('Deployment failed; publication not confirmed');
 return Object.freeze({status:'deployed',path:contentPath(published),revision:published.revision});
}

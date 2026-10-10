import { WorkerEntrypoint } from 'cloudflare:workers';

// Private service-binding RPC only. No publicly callable email-sending endpoint.
import { validateMessage } from './validation.js';

export default class EmailService extends WorkerEntrypoint {
  async fetch() {
    return new Response(JSON.stringify({error:'not_found'}),{
      status:404,headers:{'content-type':'application/json','cache-control':'no-store'}
    });
  }
  async sendTransactional(message) {
    const payload=validateMessage(message);
    if (!this.env.RESEND_API_KEY) throw new Error('email_service_not_configured');
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+this.env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':message.idempotencyKey
      },
      body:JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('email_provider_failed_'+response.status);
    const result=await response.json();
    if (!result?.id) throw new Error('email_provider_invalid_response');
    return {id:result.id,status:'accepted'};
  }
}

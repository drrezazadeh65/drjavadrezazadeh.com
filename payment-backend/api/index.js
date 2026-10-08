export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  return res.status(200).json({service:'payment-api', status:'ok', livePayments:false, health:'/api/health'});
}

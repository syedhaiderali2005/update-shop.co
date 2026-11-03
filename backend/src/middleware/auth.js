const jwt=require('jsonwebtoken');
const {User}=require('../models');
async function protect(req,res,next){
  try{
    const h=req.headers.authorization||'';
    if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Authentication required'});
    const payload=jwt.verify(h.slice(7),process.env.JWT_SECRET);
    const user=await User.findById(payload.sub).select('_id name email role active');
    if(!user||!user.active) return res.status(401).json({message:'Account unavailable'});
    req.user=user; next();
  }catch(e){return res.status(401).json({message:'Invalid or expired token'});}
}
const admin=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({message:'Admin access only'});
module.exports={protect,admin};

function notFound(req,res){res.status(404).json({message:`Route not found: ${req.method} ${req.originalUrl}`});}
function errors(err,req,res,next){
  if(err.code===11000) return res.status(409).json({message:'A record with this value already exists'});
  if(err.name==='ValidationError'||err.name==='CastError') return res.status(400).json({message:err.message});
  const status=err.status||500;
  if(status>=500) console.error(err);
  res.status(status).json({message:status>=500?'Internal server error':err.message});
}
module.exports={notFound,errors};

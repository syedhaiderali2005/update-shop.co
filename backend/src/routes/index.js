const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {Product,Category,User,Order,Banner,Setting}=require('../models');
const {protect,admin}=require('../middleware/auth');
const router=express.Router();
const asyncHandler=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const tokenFor=u=>jwt.sign({sub:u._id,role:u.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'});
const publicUser=u=>({_id:u._id,name:u.name,email:u.email,role:u.role,phone:u.phone});
const validImage=u=>{try{const x=new URL(u);return ['http:','https:'].includes(x.protocol)&&Boolean(x.hostname)}catch{return false}};
router.get('/health',(req,res)=>res.json({status:'ok',service:'shopco-api'}));

router.post('/auth/register',asyncHandler(async(req,res)=>{
 const {name,email,password}=req.body||{};
 const cleanName=typeof name==='string'?name.trim():'';
 const cleanEmail=typeof email==='string'?email.trim().toLowerCase():'';
 // Validate a normal email address. The regex must use single backslashes.
 if(cleanName.length<2||!/^\S+@\S+\.\S+$/.test(cleanEmail)||typeof password!=='string'||password.length<8) {
  return res.status(400).json({message:'Name, valid email and password (8+ characters) are required'});
 }
 if(await User.exists({email:cleanEmail})) return res.status(409).json({message:'Email already registered'});
 const user=await User.create({name:cleanName,email:cleanEmail,password:await bcrypt.hash(password,12),role:'customer'});
 res.status(201).json({token:tokenFor(user),user:publicUser(user)});
}));
router.post('/auth/login',asyncHandler(async(req,res)=>{
 const {email,password}=req.body||{}; const user=await User.findOne({email:String(email||'').toLowerCase()}).select('+password');
 if(!user||!user.active||!(await bcrypt.compare(String(password||''),user.password))) return res.status(401).json({message:'Invalid email or password'});
 res.json({token:tokenFor(user),user:publicUser(user)});
}));
router.get('/auth/me',protect,(req,res)=>res.json({user:publicUser(req.user)}));
router.post('/auth/logout',protect,(req,res)=>res.json({message:'Logged out. Remove the token on the client.'}));

// Public catalogue; admins own all writes.
router.get('/products',asyncHandler(async(req,res)=>{
 const {q,category,sort='newest',page=1,limit=24}=req.query; const filter={active:true};
 if(category) filter.categoryName=new RegExp('^'+String(category).replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')+'$','i');
 if(q) filter.$text={$search:String(q)};
 const sortMap={price_asc:{price:1},price_desc:{price:-1},rating:{rating:-1},newest:{createdAt:-1},name:{name:1}};
 const p=Math.max(1,Number(page)||1), l=Math.min(100,Math.max(1,Number(limit)||24));
 const [items,total]=await Promise.all([Product.find(filter).sort(sortMap[sort]||sortMap.newest).skip((p-1)*l).limit(l),Product.countDocuments(filter)]);
 res.json({items,total,page:p,pages:Math.ceil(total/l)});
}));
router.get('/products/:id',asyncHandler(async(req,res)=>{const p=await Product.findById(req.params.id);if(!p||!p.active)return res.status(404).json({message:'Product not found'});res.json({product:p});}));
router.get('/categories',asyncHandler(async(req,res)=>res.json({items:await Category.find({active:true}).sort({name:1})})));
router.get('/banners',asyncHandler(async(req,res)=>res.json({items:await Banner.find({active:true}).sort({sortOrder:1})})));

router.use(protect);
router.get('/users/me',asyncHandler(async(req,res)=>res.json({user:publicUser(req.user)})));
router.get('/orders/mine',asyncHandler(async(req,res)=>res.json({items:await Order.find({user:req.user._id}).sort({createdAt:-1})})));
router.post('/orders',asyncHandler(async(req,res)=>{
 const {items,address,paymentMethod}=req.body||{};
 if(!Array.isArray(items)||!items.length||!address) return res.status(400).json({message:'Items and delivery address are required'});
 const ids=items.map(x=>x.productId); const products=await Product.find({_id:{$in:ids},active:true});
 const map=new Map(products.map(p=>[String(p._id),p])); let subtotal=0; const lines=[];
 for(const line of items){const p=map.get(String(line.productId)),qty=Math.floor(Number(line.quantity));
  if(!p||!Number.isInteger(qty)||qty<1||p.stock<qty) return res.status(400).json({message:`Invalid item or insufficient stock: ${p?.name||'product'}`});
  subtotal+=p.price*qty;lines.push({product:p._id,name:p.name,image:p.image||p.images[0]||'',price:p.price,quantity:qty,size:line.size||'',variant:line.variant||''});
 }
 const reserved=[];
 try {
  for(const line of lines){
   const result=await Product.updateOne({_id:line.product,active:true,stock:{$gte:line.quantity}},{$inc:{stock:-line.quantity}});
   if(result.modifiedCount!==1) throw Object.assign(new Error(`Insufficient stock for ${line.name}`),{status:409});
   reserved.push(line);
  }
  const shipping=subtotal>=200?0:15;
  const order=await Order.create({user:req.user._id,items:lines,subtotal,shipping,total:subtotal+shipping,address:String(address).trim(),paymentMethod:paymentMethod||'Cash on Delivery',orderNumber:'SC-'+Date.now()});
  res.status(201).json({order});
 } catch(error) {
  if(reserved.length) await Promise.all(reserved.map(line=>Product.updateOne({_id:line.product},{$inc:{stock:line.quantity}})));
  throw error;
 }
}));
router.get('/orders/:id',asyncHandler(async(req,res)=>{const o=await Order.findOne({_id:req.params.id,user:req.user._id});if(!o)return res.status(404).json({message:'Order not found'});res.json({order:o});}));

// All management endpoints require both a valid JWT and admin role.
router.use(admin);
const crud=(path,Model,opts={})=>{
 router.get(path,asyncHandler(async(req,res)=>res.json({items:await Model.find({}).sort({createdAt:-1})})));
 router.post(path,asyncHandler(async(req,res)=>{
  const body={...req.body}; if(opts.product){const images=body.images|| (body.image?[body.image]:[]);if(images.some(x=>!validImage(x)))return res.status(400).json({message:'Images must be valid HTTP(S) URLs'});if(new Set(images).size!==images.length)return res.status(400).json({message:'Product images must be unique'});if(images.length&&await Product.exists({$or:[{image:{$in:images}},{images:{$in:images}}]}))return res.status(409).json({message:'An image URL is already assigned to another product'});body.images=images;body.image=body.image||images[0]||'';}
  const item=await Model.create(body);res.status(201).json({item});
 }));
 router.patch(path+'/:id',asyncHandler(async(req,res)=>{
  const body={...req.body};if(opts.product){const images=body.images|| (body.image?[body.image]:[]);if(images.some(x=>!validImage(x)))return res.status(400).json({message:'Images must be valid HTTP(S) URLs'});if(new Set(images).size!==images.length)return res.status(400).json({message:'Product images must be unique'});if(images.length&&await Product.exists({_id:{$ne:req.params.id},$or:[{image:{$in:images}},{images:{$in:images}}]}))return res.status(409).json({message:'An image URL is already assigned to another product'});body.images=images;body.image=body.image||images[0]||'';}
  const item=await Model.findByIdAndUpdate(req.params.id,body,{new:true,runValidators:true});if(!item)return res.status(404).json({message:'Record not found'});res.json({item});
 }));
 router.delete(path+'/:id',asyncHandler(async(req,res)=>{const item=await Model.findByIdAndDelete(req.params.id);if(!item)return res.status(404).json({message:'Record not found'});res.json({message:'Deleted'});}));
};
crud('/admin/products',Product,{product:true});crud('/admin/categories',Category);crud('/admin/banners',Banner);crud('/admin/settings',Setting);
router.get('/admin/users',asyncHandler(async(req,res)=>res.json({items:await User.find({}).select('-password').sort({createdAt:-1})})));
router.patch('/admin/users/:id',asyncHandler(async(req,res)=>{const allowed={};['name','phone','active'].forEach(k=>{if(req.body[k]!==undefined)allowed[k]=req.body[k]});const u=await User.findByIdAndUpdate(req.params.id,allowed,{new:true,runValidators:true}).select('-password');if(!u)return res.status(404).json({message:'User not found'});res.json({user:u});}));
router.delete('/admin/users/:id',asyncHandler(async(req,res)=>{if(String(req.user._id)===req.params.id)return res.status(400).json({message:'Cannot delete your own admin account'});await User.findByIdAndDelete(req.params.id);res.json({message:'Deleted'});}));
router.get('/admin/orders',asyncHandler(async(req,res)=>res.json({items:await Order.find({}).populate('user','name email').sort({createdAt:-1})})));
router.patch('/admin/orders/:id',asyncHandler(async(req,res)=>{
 const allowed=['Placed','Processing','Shipped','Delivered','Cancelled'];
 if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid order status'});
 if(req.body.status==='Cancelled'){
  const result=await Order.updateOne({_id:req.params.id,status:{$ne:'Cancelled'}},{$set:{status:'Cancelled'}});
  const order=await Order.findById(req.params.id);if(!order)return res.status(404).json({message:'Order not found'});
  if(result.modifiedCount===1)for(const line of order.items)await Product.updateOne({_id:line.product},{$inc:{stock:line.quantity}});
  return res.json({order});
 }
 const current=await Order.findById(req.params.id);if(!current)return res.status(404).json({message:'Order not found'});
 if(current.status==='Cancelled')return res.status(409).json({message:'Cancelled orders cannot be reopened automatically'});
 current.status=req.body.status;await current.save();res.json({order:current});
}));
router.delete('/admin/orders/:id',asyncHandler(async(req,res)=>{const order=await Order.findByIdAndDelete(req.params.id);if(!order)return res.status(404).json({message:'Order not found'});if(order.status!=='Cancelled')for(const line of order.items)await Product.updateOne({_id:line.product},{$inc:{stock:line.quantity}});res.json({message:'Deleted'});}));
router.get('/admin/stats',asyncHandler(async(req,res)=>{
 const [products,users,orders,revenue,lowStock]=await Promise.all([Product.countDocuments(),User.countDocuments({role:'customer'}),Order.countDocuments(),Order.aggregate([{$match:{status:{$ne:'Cancelled'}}},{$group:{_id:null,total:{$sum:'$total'}}}]),Product.countDocuments({stock:{$lte:5}})]);
 res.json({products,customers:users,orders,revenue:revenue[0]?.total||0,lowStock});
}));
module.exports=router;

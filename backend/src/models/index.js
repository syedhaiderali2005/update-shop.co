const mongoose = require('mongoose');
const { Schema } = mongoose;
const opts = { timestamps: true };
const ProductSchema = new Schema({
  name:{type:String,required:true,trim:true}, slug:{type:String,unique:true,sparse:true},
  description:{type:String,default:''}, price:{type:Number,required:true,min:0},
  oldPrice:{type:Number,min:0}, category:{type:Schema.Types.ObjectId,ref:'Category'},
  categoryName:{type:String,default:''}, style:{type:String,default:'Casual'},
  images:{type:[String],default:[]}, image:{type:String,default:''},
  stock:{type:Number,default:0,min:0}, sku:{type:String,trim:true},
  sizes:{type:[String],default:[]}, variants:{type:[Schema.Types.Mixed],default:[]},
  rating:{type:Number,default:0,min:0,max:5}, reviews:{type:Number,default:0,min:0},
  badge:{type:String,default:''}, active:{type:Boolean,default:true}
},opts);
ProductSchema.index({name:'text',description:'text',categoryName:'text'});
const Category = mongoose.model('Category',new Schema({name:{type:String,required:true,unique:true,trim:true},slug:{type:String,required:true,unique:true},description:String,image:String,active:{type:Boolean,default:true}},opts));
const User = mongoose.model('User',new Schema({
  name:{type:String,required:true,trim:true},email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  password:{type:String,required:true,select:false},role:{type:String,enum:['customer','admin'],default:'customer'},
  phone:String,address:String,active:{type:Boolean,default:true}
},opts));
const Order = mongoose.model('Order',new Schema({
  orderNumber:{type:String,unique:true},user:{type:Schema.Types.ObjectId,ref:'User',required:true},
  items:[{product:{type:Schema.Types.ObjectId,ref:'Product'},name:String,image:String,price:Number,quantity:Number,size:String,variant:String}],
  subtotal:{type:Number,required:true},shipping:{type:Number,default:0},total:{type:Number,required:true},
  address:{type:String,required:true},paymentMethod:{type:String,default:'Cash on Delivery'},
  status:{type:String,enum:['Placed','Processing','Shipped','Delivered','Cancelled'],default:'Placed'}
},opts));
const Banner = mongoose.model('Banner',new Schema({title:String,subtitle:String,image:{type:String,required:true},link:String,active:{type:Boolean,default:true},sortOrder:{type:Number,default:0}},opts));
const Setting = mongoose.model('Setting',new Schema({key:{type:String,unique:true,required:true},value:Schema.Types.Mixed},opts));
module.exports={Product:mongoose.model('Product',ProductSchema),Category,User,Order,Banner,Setting};

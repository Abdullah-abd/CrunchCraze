
var express = require('express')
var ejs = require('ejs')
var bodyParser = require('body-parser')
var mysql = require('mysql')
var session = require('express-session');

mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"node_project"
})

function isProductInCart(cart,id){
    for(let i = 0; i<cart.length; i++){
        if(cart.id == id){
            return true;
        }
    }
    return false;
}
function calculateTotal(cart,req){
    var total =0;
    for(let i=0; i<cart.length; i++){
        if(cart[i].sale_price){
            total+= (cart[i].sale_price*cart[i].quantity);
        }else{
            total += (cart[i].price*cart[i].quantity);
        }
    }
    req.session.total = total;
    return total;
}


var app = express()
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.listen(3005)
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', function (req, res) {

    var con = mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_project"
    })    
    con.query("SELECT * FROM `products`",(err,result)=>{
        res.render('pages/index',{result:result})
    })

    
})

app.post('/add_to_cart', function(req,res){
    var id = req.body.id
    var name = req.body.name
    var price = req.body.price
    var sale_price = req.body.sale_price
    var quantity = req.body.quantity
    var image = req.body.image
    var product = {
        id: id,
        name: name,
        price: price,
        sale_price : sale_price,
        quantity : quantity,
        image : image
    }

    if(req.session.cart){
        var cart = req.session.cart;

        if(!isProductInCart(cart,id)){
            cart.push(product)
        }
    } else{
        req.session.cart = [product]
        var cart = req.session.cart
    }

    calculateTotal(cart,req);

    res.redirect('/cart')
})


// app.post("/check_cart",function(req,res){
//     res.redirect('/cart')
// })


app.get('/cart',function(req,res){
    var cart = req.session.cart
    var total = req.session.total

    res.render('pages/cart',{cart: cart, total : total})

})


app.post('/remove_item', function(req,res){
    var  itemId = req.body.id;
    var cart=req.session.cart;
    var itemIndex = cart.findIndex(item => item.id === itemId)

    if (itemIndex !== -1) {
        // Remove the item from the cartItems array using splice
        cart.splice(itemIndex, 1);
        calculateTotal(cart,req);
        res.redirect('/cart')
      } else {
        res.send('Item not found in cart');
      }

      

})

app.post('/edit_quantity', function(req,res){
    var id = req.body.id;
    var quantity = req.body.quantity;
    var increaseBtn = req.body.increase_product_quantity_btn
    var decreaseBtn = req.body.decrease_product_quantity_btn
    var cart=req.session.cart;

    if(increaseBtn){
        var itemToUpdate = cart.find(item => item.id === id);
        if(itemToUpdate.quantity>0){
            itemToUpdate.quantity = parseInt(quantity)+1;
            calculateTotal(cart, req);
            res.redirect('/cart')
        }
     
      
    
    } else if(decreaseBtn){
        var itemToUpdate = cart.find(item => item.id === id);
       if(itemToUpdate.quantity>1){
        itemToUpdate.quantity = parseInt(quantity)-1;
        calculateTotal(cart, req);
        
        res.redirect('/cart');
       }
    }
})

app.get('/checkout',function(req,res){
    var total = req.session.total;
    res.render('pages/checkout',{total:total})
})

app.post('/place_order',function(req,res){
    var name =req.body.name;
    var email = req.body.Email;
    var phone = req.body.phone;
    var address = req.body.address;
    var city = req.body.city;
    var cost = req.session.total;
    var status = "not paid";
    var date = new Date();
    var products_ids = "";
    var id= Date.now();
    req.session.order_id = id;
    
    var con = mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_project"
    })
    var cart=req.session.cart; 
    for(let i=0; i<cart.length; i++){
        products_ids = products_ids +","+cart.id;
    } 
    con.connect(function(err) {
        if (err) {
            console.log(err);
        } else {
            var query = "INSERT INTO orders(id,cost,name,email,status,city,address,phone,date,products_ids) VALUES ?"
            var VALUES = [
                [id,cost,name,email,status,city,address,phone,date,products_ids]
            ];
            con .query(query,[VALUES],(err,result)=>{
                for( let i=0; i<cart.length; i++){
                    var query = "INSERT INTO order_items(Order_id,Product_id,Product_price,Product_image,Product_quantity,Order_date,Product_name) Values ?"
                    var VALUES = [
                        [id,cart[i].id,cart[i].name,cart[i].price,new Date(),cart[i].quantity,cart[i].image]
                    ]
                    con.query(query,VALUES,(err,result)=>{})
                }
                res.redirect('/payment')
            })
        }
    });
})

app.get('/payment',function(req,res){
    var total = req.session.total;
    res.render('pages/payment',{total:total})
})


app.get("/verify_payment",function(req,res){
    var transaction_id= req.query.transaction_id;
    var order_id= req.session.order_id;

    var con = mysql.createConnection({
        host:"localhost",
        user:"root",
        password:"",
        database:"node_project"
    })

    con.connect((err)=> {
        if (err) {
            console.log(err);
        } else {
            var query = "INSERT INTO payments(order_id,transaction_id,date) VALUES ?"
            var VALUES = [
                [order_id,transaction_id,new Date()]
            ]
            con.query(query,[VALUES],(err,result)=>{
                con.query("UPDATE orders SET status='paid' WHERE id='"+order_id+"'",(err,result)=>{})
                res.redirect('/thank_you')
            })
    }
    })
})

app.get('/thank_you',function(req,res){
    var order_id= req.session.order_id;
    res.render('pages/thank_you',{order_id:order_id})
})


app.post('/home',function(req,res){
    console.log("POST request to /home received");
    res.redirect('/')
})

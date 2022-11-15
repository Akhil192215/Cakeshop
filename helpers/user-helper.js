var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt')
const collections = require('../config/collections')
const { response } = require('../app')
const Razorpay = require('razorpay')
const { resolve } = require('path')
var objectId = require('mongodb').ObjectId
var instance = new Razorpay({
    key_id: 'rzp_test_3IQgnpK0EFn6UK',
    key_secret: 'HN8VZ6buo45ZxtR11g4b3uCt',
});
const paypal = require('paypal-rest-sdk');



module.exports = {
    signUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            let checker = {}
            userData.psw = await bcrypt.hash(userData.psw, 10)
            let validator = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email })
            if (validator) {
                checker.message = true
                resolve(checker)
            } else {
                db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data) => {
                    checker.user = data.insertedId
                    db.get().collection(collection.WALLET_COLLECTION).insertOne({ userId: objectId(data.insertedId), totalBalance: 0 })
                    checker.message = false
                    resolve(checker)
                })

            }
        })
    },
    login: (userData) => {
        return new Promise(async (resolve, reject) => {
            let status = {}
            let validator = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email })
            let blockStatus = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email }, { blockStatus: true })
            if (validator) {
                bcrypt.compare(userData.psw, validator.psw).then((result) => {
                    if (result) {
                        if (blockStatus.blockStatus) {
                            status.user = true
                            resolve(status)
                        } else {
                            status.user = false
                            status.phone = validator.phone
                            status.id = validator._id
                            resolve(status)
                        }

                    } else {
                        status.psw = true
                        resolve(status)
                    }
                })
            } else {
                status.email = true
                resolve(status)
            }
        })
    },
    getuser: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })

    },
    getprodetails: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(Id) }, {
                $inc: { view: 1 }
            })
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(Id) }).then((response) => {
                resolve(response)
            })
        })
    },
    addToCart: (id, userId) => {
        proObj = {
            item: objectId(id),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart?.products?.findIndex(product => product.item == id)
                console.log(proExist)
                if (proExist != -1) {
                    console.log(proExist)
                    // db.get().collection(collections.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(id) }, {
                    //     $inc: { 'products.$.quantity': 1 }
                    // }).then((result) => {
                    //     resolve()
                    // })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }).then((result) => {
                            resolve(result)
                        })
                }
            } else {
                cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    moveToCart: (proId, userId) => {
        console.log('inside funtion ', proId, userId)
        proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                console.log('hrewewwwwwwwwwwww1')
                let proExist = userCart?.products?.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ userId: objectId(userId) },
                        { $pull: { products: { proId: objectId(proId) } } }).then(async (response) => {
                            let whishList = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ userId: objectId(userId) })
                            if (whishList.products.length == 0) {
                                response.last = true
                                resolve(response)
                            }
                            resolve(response)
                        })
                } else {
                    console.log('hrewewwwwwwwwwwww2')
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }).then((result) => {
                            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ userId: objectId(userId) },
                                { $pull: { products: { proId: objectId(proId) } } }).then(async (response) => {
                                    let whishList = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ userId: objectId(userId) })
                                    if (whishList.products.length == 0) {
                                        response.last = true
                                    }
                                })
                            resolve(result)
                        })

                }
            } else {
                cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    console.log('hrewewwwwwwwwwwww3')
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ userId: objectId(userId) },
                        { $pull: { products: objectId(proId) } }).then(async (response) => {
                            let whishList = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ userId: objectId(userId) })
                            if (whishList.products.length == 0) {
                                response.last = true
                            }
                        })
                    resolve(response)
                })
            }
        })
    },




    getCartProducts: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    },

                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }, result: { $multiply: ["$quantity", { $toInt: { $arrayElemAt: ['$product.price', 0] } }] }
                    }
                }
            ]).toArray().then((data) => {
                if (!data == []) {
                    resolve(data)
                } else {
                    resolve(false)
                }
            }).catch((err) => {
                console.log(err)
            })


        })
    },
    getCartCounter: async (userId) => {

        //     const cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
        //     let count = 0;
        //     if (cart) {
        //         count = cart.products?.length
        //     }
        //     return count
        // },

        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) }).then((cart) => {
                let count = 0;
                if (cart) {
                    count = cart.products?.length
                }
                resolve(count)
            })
        })
    },
    getWishListCounter: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).findOne({ userId: objectId(userId) }).then((whishList) => {
                let count = 0;
                if (whishList) {
                    count = whishList.products?.length
                }
                resolve(count)
            })
        })
    },
    changeQuantity: (({ cart, product, count }) => {
        count = parseInt(count)
        let obj = {}
        return new Promise((resolve, reject) => {
            db.get().collection(collections.CART_COLLECTION).updateOne({ _id: objectId(cart), 'products.item': objectId(product) }, {
                $inc: { 'products.$.quantity': count }
            }).then((result) => {
                if (count == 1) {
                    obj.values = true
                    resolve(obj)
                } else {
                    obj.values = false
                    resolve(obj)
                }

            })
        })
    }),
    getUserAddress: (userId) => {
        return new Promise((resolve, reject) => {
            let userObj = {}
            db.get().collection(collection.ADDRRESS_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$address'
                },
                {
                    $project: {
                        address: 1
                    }
                }

            ]).toArray().then((result) => {
                resolve(result)
            })

        })
    },
    removeproduct: ({ cartId, proId }) => {
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(cartId) },
                { $pull: { products: { item: objectId(proId) } } }).then(async (response) => {
                    let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ _id: objectId(cartId) })
                    if (cart?.products?.length == 0) {
                        response.last = true
                        resolve(response)
                    }
                    resolve(response)
                })
        })
    },
    whishRemove: ({ wishId, proId }) => {
        console.log(wishId, proId, ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;')
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ _id: objectId(wishId) },
                { $pull: { products: { proId: objectId(proId) } } }).then((response) => {
                    resolve(response)
                })
        })
    },
    getTotal: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    },
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    },
                },
                {
                    $group: {
                        _id: null, total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }
                    }
                }
            ]).toArray().then((total) => {
                let totalAmount = total?.[0]?.total
                resolve(totalAmount)
            })
        })
    },
    placeOrder: (order, products, total, userid) => {
        return new Promise((resolve, response) => {
            let orderObj = {}
            db.get().collection(collection.ADDRRESS_COLLECTION).findOne().then((data) => {
                if (order.paymentMethod != 'COD') {
                    for (let i in products) {
                        products[i].paymentStatus = 'pending'
                    }
                }
                let status = order.paymentMethod == 'COD' ? 'placed' : 'placed'
                for (const i of products) {
                    i.status = status
                }
                let date = new Date()
                let time = date
                orderObj = {
                    address: data.address[order.userId],
                    userId: objectId(userid),
                    orderdProducts: products,
                    totalMoney: total,
                    date: time,
                    paymentMethod: order.paymentMethod,
                    status: status
                }

                db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                    db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(orderObj.userId) })
                    resolve(response)
                })
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) }).then((result) => {
                resolve(result?.products)
            })
        })
    },
    addAddress: (detailes) => {
        return new Promise(async (resolve, reject) => {
            let addressinfo = {
                address: detailes?.address,
                phone: detailes?.phone,
                email: detailes?.email,
                pincode: detailes?.pincode,
                addressName: detailes?.Aame,
                addressId: objectId()
            }
            addchecker = await db.get().collection(collection.ADDRRESS_COLLECTION).findOne({ user: objectId(detailes.userId) })
            if (addchecker) {
                db.get().collection(collection.ADDRRESS_COLLECTION).updateOne({ user: objectId(detailes.userId) }, {
                    $push: { address: addressinfo }
                }).then((response) => {
                    resolve(response)
                })
            } else {
                addressobj = {
                    user: objectId(detailes.userId),
                    address: [addressinfo]
                }
                db.get().collection(collection.ADDRRESS_COLLECTION).insertOne(addressobj).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    getTotalCheckout: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    },
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    },
                },
                {
                    $project: {
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }
                    }
                }
            ]).toArray().then((total) => {


                resolve(total)
            })
        })
    },
    getOrders: (userId, currentPage) => {
        return new Promise((resolve, reject) => {
            const perPage = 10
            const skip = (currentPage - 1) * perPage;
            db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).sort({ _id: -1 }).skip(skip).limit(perPage).toArray().then((orders) => {
                resolve(orders)
            })
        })
    },
    getOrderProducts: (Id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(Id) }
                },
                {
                    $unwind: '$orderdProducts'
                },
                {
                    $project: {
                        item: '$orderdProducts.item',
                        quantity: '$orderdProducts.quantity',
                        status: '$orderdProducts.status',
                        orderId: '$orderdProducts._id',
                        paymentStatus: '$orderdProducts.paymentStatus'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    },
                },
                {
                    $project: {
                        item: 1, quantity: 1, orderId: 1, status: 1, paymentStatus: 1, product: { $arrayElemAt: ['$product', 0] }
                    },
                }
            ]).toArray().then((products) => {
                resolve(products)
            })

        })

    },
    getUserphone: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((users) => {
                resolve(users)
            })

        })
    },

    cancelOrder: ({ orderId, proId }) => {
        return new Promise(async (resolve, reject) => {


            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            for (const i of order.orderdProducts) {
                ;
                if (i.item == proId) {
                    i.status = 'Cancelled'
                    db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                        {
                            $set: { ...order }
                        })
                    break;

                }
            }

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                { $set: { "orderdProducts.$[].paymentStatus": 'Refunded' } })

            let value = order.orderdProducts.every((i) =>
                i.status === "Cancel"
            )

            if (value) {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                    {
                        $set: { 'status': 'Cancel' }
                    })
            }

            resolve()
        })

    },
    getuserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((data) => {
                resolve(data)
            })
        })
    },
    deleteAdd: (addresss) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRRESS_COLLECTION).updateOne({ _id: objectId(addresss.addressId) },
                {
                    $pull: { address: { addressId: objectId(addresss.index) } }
                }

            ).then((result) => {
                resolve()
            })
        })
    },
    pswChange: (data, userId) => {
        return new Promise(async (resolve, reject) => {
            data.psw = await bcrypt.hash(data.psw, 10)
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: { psw: data.psw }
            }).then((response) => {
                resolve()
            })
        })

    },
    pswMatch: (userId, currentpsw) => {
        console.log(userId,currentpsw)
        return new Promise(async (resolve, reject) => {
            const user = await db.get().collection(collection.USER_COLLECTION).find({ _id: objectId(userId) })
            if (user) {
                console.log(user.psw)
                // bcrypt.compare(currentpsw, user.psw).then((result) => {
                //     if(result){
                //         console.log(result)
                //         resolve(true)
                //     }else{
                //         resolve(false)
                //     }
                // })
            }else{
                console.log('user not found')
            }
        })

    },
    generateRazorpay: (orderId, totalPrice) => {
        return new Promise((resolve, reject) => {

            var options = {
                amount: totalPrice * 100,
                currency: "INR",
                receipt: "" + orderId
            }
            instance.orders.create(options, function (err, order) {
                if (err) {
                } else {

                    resolve(order)
                }
            })
        })

    },
    verifyPayment: (detailes) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'HN8VZ6buo45ZxtR11g4b3uCt')
            hmac.update(detailes.payment.razorpay_order_id + '|' + detailes.payment.razorpay_payment_id)
            hmac = hmac.digest('hex')
            if (hmac == detailes.payment.razorpay_signature) {
                resolve()
            } else {
                reject
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).update({ _id: objectId(orderId) },
                {
                    $set: {
                        'status': 'placed'
                    }
                }
            ).then((data) => {
                resolve()
            })
        }).catch((err) => {
            console.log(err)
        })
    },
    paypal: (amount) => {
        return new Promise((resolve, reject) => {

            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "https://shopcakes.shop/success",
                    "cancel_url": "http://localhost:3000/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "Red Sox Hat",
                            "sku": "001",
                            "price": '25.00',
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": '25.00'
                    },
                    "description": "Hat for the best team ever"
                }]
            };

            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    throw error;
                } else {
                    for (let i = 0; i < payment.links.length; i++) {
                        if (payment.links[i].rel === 'approval_url') {
                            resolve({ paypal: payment.links[i].href })
                            break;
                        }
                    }
                }
            });
        }).catch((err) => {
            console.log(err);
        })
    },
    discount: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {
                        user: objectId(userId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },

                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'product.category',
                        foreignField: 'category',
                        as: 'category'
                    }

                },
                {
                    $unwind: '$category'
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: 1, category: 1,
                        discountOff: { $cond: { if: { $gt: [{ $toInt: "$product.productOffer" }, { $toInt: '$category.categoryOffer' }] }, then: "$product.productOffer", else: '$category.categoryOffer' } },
                        // productOffer:"$product.productOffer",
                        // productOffer:'$category.categoryOffer',
                    }

                },
                {
                    $addFields: {

                        discountedAmount: { $round: { $divide: [{ $multiply: [{ $toInt: "$product.price" }, { $toInt: "$discountOff" }] }, 100] } },
                    }
                },
                {
                    $addFields: {
                        priceAfterDiscount: { $round: { $subtract: [{ $toInt: "$product.price" }, { $toInt: "$discountedAmount" }] } }
                    }
                },
                {
                    $addFields: {
                        totalAfterDiscount: { $multiply: ['$quantity', { $toInt: '$priceAfterDiscount' }] }
                    }
                }


            ]).toArray().then((discount) => {
                resolve(discount)
            })


        })
    },
    totalAfterDiscount: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {
                        user: objectId(userId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },

                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'product.category',
                        foreignField: 'category',
                        as: 'category'
                    }

                },
                {
                    $unwind: '$category'
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: 1, category: 1,
                        discountOff: { $cond: { if: { $gt: [{ $toInt: "$product.productOffer" }, { $toInt: '$category.categoryOffer' }] }, then: "$product.productOffer", else: '$category.categoryOffer' } },
                        // productOffer:"$product.productOffer",
                        // productOffer:'$category.categoryOffer',
                    }
                },
                {
                    $addFields: {

                        discountedAmount: { $round: { $divide: [{ $multiply: [{ $toInt: "$product.price" }, { $toInt: "$discountOff" }] }, 100] } },
                    }
                },
                {
                    $addFields: {
                        priceAfterDiscount: { $round: { $subtract: [{ $toInt: "$product.price" }, { $toInt: "$discountedAmount" }] } }
                    }
                },
                {
                    $addFields: {
                        totalAfterDiscount: { $multiply: ['$quantity', { $toInt: '$priceAfterDiscount' }] }
                    }
                },
                {
                    $group: {

                        _id: null, total: { $sum: { $multiply: ['$quantity', { $toInt: '$totalAfterDiscount' }] } }
                    }

                }
            ]).toArray().then((data) => {

                let totalAmount = data?.[0]?.total
                resolve(totalAmount)
            })

        })


    },

    totalAfterD: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {
                        user: objectId(userId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },

                {
                    $lookup: {
                        from: collection.CATEGORY_COLLECTION,
                        localField: 'product.category',
                        foreignField: 'category',
                        as: 'category'
                    }

                },
                {
                    $unwind: '$category'
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: 1, category: 1,
                        discountOff: { $cond: { if: { $gt: [{ $toInt: "$product.productOffer" }, { $toInt: '$category.categoryOffer' }] }, then: "$product.productOffer", else: '$category.categoryOffer' } },
                        // productOffer:"$product.productOffer",
                        // productOffer:'$category.categoryOffer',
                    }
                },
                {
                    $addFields: {

                        discountedAmount: { $round: { $divide: [{ $multiply: [{ $toInt: "$product.price" }, { $toInt: "$discountOff" }] }, 100] } },
                    }
                },
                {
                    $addFields: {
                        priceAfterDiscount: { $round: { $subtract: [{ $toInt: "$product.price" }, { $toInt: "$discountedAmount" }] } }
                    }
                },
                {
                    $addFields: {
                        totalAfterDiscount: { $multiply: ['$quantity', { $toInt: '$priceAfterDiscount' }] }
                    }
                },
            ]).toArray().then((totalAfterDiscount) => {
                let totalAmount = totalAfterDiscount;
                resolve(totalAfterDiscount)
            })
        })
    },
    addCoupon: (coupon) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then((response) => {
                resolve()
            })
        }).catch((err) => {
            console.log(err)
        })
    },

    getCoupon: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).find().toArray().then((coupon) => {
                resolve(coupon)
            })
        })
    },
    applyCoupon: (coupon, total) => {
        return new Promise(async (resolve, response) => {
            const checker = await db.get().collection(collection.COUPON_COLLECTION).findOne({ coupon: coupon.coupon })
            const message = {}
            if (checker) {
                let date = new Date().toLocaleDateString()
                let date1 = checker.date
                expiry = date < date1
                if (expiry) {
                    let alreadyUsed = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(coupon.userId), appliedCoupons: coupon.coupon })
                    if (alreadyUsed) {
                        message.alreadyUsed = true
                        resolve(message)
                    } else {
                        const discountRate = parseInt(checker.discount)
                        const couponAmount = total * discountRate / 100
                        const totalAfterCoupon = total - couponAmount
                        message.totalAfterCoupon = totalAfterCoupon
                        message.applied = true
                        resolve(message)

                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(coupon.userId) },
                            {
                                $push: { appliedCoupons: coupon.coupon }
                            })
                    }
                } else {
                    message.expiry = true
                    resolve(message)
                }
            } else {
                message.invalid = true
                resolve(message)
            }
        })
    },
    paymentStatus: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(proId) },
                { $set: { "orderdProducts.$[].paymentStatus": 'Success' } })
        })
    },
    changeStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                { $set: { "orderdProducts.$[].paymentStatus": 'Refunded', "orderdProducts.$[].status": 'return' } })

        })

    },
    categoryList: (categoryId, currentPage) => {
        return new Promise((resolve, reject) => {
            const perPage = 8
            const skip = (currentPage - 1) * perPage;
            db.get().collection(collection.CATEGORY_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(categoryId) }
                },
                {
                    $project: {
                        categoryName: '$category'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'categoryName',
                        foreignField: 'category',
                        as: 'products'
                    },

                },
                {
                    $unwind: '$products'
                }
            ]).sort({ _id: -1 }).skip(skip).limit(perPage).toArray().then((products) => {
                resolve(products)
            })
        })
    },
    addToWhish: (proId, userId) => {
        const proObj = {
            proId: objectId(proId)
        }
        return new Promise(async (resolve, reject) => {
            let whishList = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ userId: objectId(userId) })
            if (whishList) {
                let proExist = whishList?.products?.findIndex(product => product.proId == proId)
                console.log(proExist)
                if (proExist != -1) {
                    console.log(proExist)
                    // db.get().collection(collections.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(id) }, {
                    //     $inc: { 'products.$.quantity': 1 }
                    // }).then((result) => {
                    //     resolve()
                    // })
                } else {
                    db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ userId: objectId(userId) }, {
                        $push: { products: proObj }
                    }).then((response) => {
                        resolve()
                    })
                }




            } else {
                const whishListObj = {
                    userId: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(whishListObj).then((response) => {
                    resolve()
                })
            }
        }).catch((err) => {
            console.log(err)
        })
    },
    getWishList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([{
                $match: { userId: objectId(userId) }
            },
            {
                $unwind: '$products'
            },
            {
                $project: {
                    proId: '$products.proId'
                }
            },
            {
                $lookup: {
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'proId',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $project: {

                    proId: 1, userId: 1, products: { $arrayElemAt: ['$products', 0] }
                }
            }
            ]).toArray()
            resolve(products)
        })
    },
    getSlider: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_SLIDER).find().toArray().then((result) => {
                resolve(result)
            })
        })
    },
    getServices: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.SERVICES_COLLECTION).find().toArray().then((result) => {
                resolve(result)
            })
        })
    },
    getBanner3: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER3_COLLECTION).find().toArray().then((result) => {
                resolve(result)
            })
        })
    },
    checkUser: async (userId) => {
        return await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
    },
    referalChecker: async (referalUser, currentUser) => {
        const referal = await db.get().collection(collection.REFERAL_COLLECTION).findOne({ userId: referalUser })
        if (referal) {
            await db.get().collection(collection.REFERAL_COLLECTION).updateOne({ userId: referalUser }, {
                $push: { referdUsers: objectId(currentUser) }
            })
        } else {
            await db.get().collection(collection.REFERAL_COLLECTION).insertOne({
                userId: objectId(referalUser), referdUsers: [objectId(currentUser)]
            })
        }
    },
    addReferalAmount: async (user, amount) => {
        const wallet = await db.get().collection(collection.WALLET_COLLECTION).updateOne({ userId: objectId(user) }, {
            $inc: { totalBalance: amount }
        })
    },
    getWallet: async (user) => {
        // return await db.get().collection(collection.WALLET_COLLECTION).findOne({ userId: objectId(user) })
        return new Promise((resolve, reject) => {
            db.get().collection(collection.WALLET_COLLECTION).findOne({ userId: objectId(user) }).then((wallet) => {
                resolve(wallet.totalBalance)
            })
        })
    },
    trendingProducts: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).find().sort({ view: -1 }).limit(8).toArray().then((trending) => {
                resolve(trending)
            })
        })
    }
}


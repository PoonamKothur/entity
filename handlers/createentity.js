const responseHandler = require("../common/responsehandler");
const BaseHandler = require("../common/basehandler");
const utils = require('../common/utils');
const Joi = require('joi');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();
const moment = require('moment');

class AddCustomers extends BaseHandler {
    //this is main function
    constructor() {
        super();
    }

    generateRandomeuid(min, max) {
        return (Math.random().toString(36).substring(min, max) + Math.random().toString(36).substring(min, max)).toUpperCase();
    }

    getValidationSchema() {
        this.log.info('Inside getValidationSchema');

        return Joi.object().keys({
            cid: Joi.string().required(),
            cuid: Joi.string().required(),
            business: {
                firstName: Joi.string(),
                lastName: Joi.string(),
                email: Joi.string().email(),
                phone: Joi.string()
            },
            technical: {
                firstName: Joi.string().optional(),
                lastName: Joi.string().optional(),
                email: Joi.string().email().optional(),
                phone: Joi.string().optional(),
                //attributes:  Joi.string().optional(),            //TODO
                registration: Joi.date().optional(),
                lastUpdate: Joi.date().optional()
            }
        });
    }

    // This function is used to get customer by cid
    async checkIfCustomerExists(cid,cuid) {
        console.log("in check customer exists");
        
        var params = {
            TableName:`customers-${process.env.STAGE}`,
            KeyConditionExpression:"#cid = :cidValue and #cuid = :cuidValue",
            ExpressionAttributeNames: {
                "#cid":"cid",
                "#cuid":"cuid"
            },
            ExpressionAttributeValues: {
                ":cid": cid,
                ":cuid": cuid
            }           
        };

        confirm.log(params);
        // let valRes = await dynamodb.get({
        //     TableName: `customers-${process.env.STAGE}`,
        //     Key: {
        //         cid: cid
        //     },
        //     ProjectionExpression: 'cid'
        // }).promise();

        // if (valRes && 'Item' in valRes && valRes.Item && 'cid' in valRes.Item && valRes.Item.cid) {
        //     return true;
        // }
        // else {
        //     return false;
        // }
    }

    //values insert if customer does not exists
    async createCustomer(body) {

        const euid = this.generateRandomeuid(2, 6);
        let item = {
            euid: euid
        };

        if (!utils.isNullOrEmptyKey(body, 'secondary')) {
            body.secondary.lastUpdate = moment.utc().valueOf();
        }

        const params = {
            TableName: `customers-${process.env.STAGE}`,
            Item: Object.assign(item, body)
        };
        await dynamodb.put(params).promise();
        return cuid;
    }


    async process(event, context, callback) {

        let body = event.body ? JSON.parse(event.body) : event;

        // Validate the input
        //await utils.validate(body, this.getValidationSchema());

        // Check if cid and cuid already exists
        console.log("cid from body----" + body.cid);
        console.log("cuid from body----" + body.cuid);
        let customerExists = await this.checkIfCustomerExists(body.cid, body.cuid);
        this.log.debug("customerExists:" + customerExists);
        if (customerExists) {
            return responseHandler.callbackRespondWithSimpleMessage('400', 'Duplicate customer');
        }

        // // Call to insert customer
        // let cuid = await this.createCustomer(body);

        // let resp = {
        //     cid: body.cid,
        //     cuid: cuid,
        //     msg: "Customer Created Successfully"
        // };
        // this.log.debug(resp);
        // return responseHandler.callbackRespondWithSimpleMessage(200, resp);
    }
}

exports.createcustomer = async (event, context, callback) => {
    return await new AddCustomers().handler(event, context, callback);
}

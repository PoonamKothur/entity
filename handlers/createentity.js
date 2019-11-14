const responseHandler = require("../common/responsehandler");
const BaseHandler = require("../common/basehandler");
const utils = require('../common/utils');
const Joi = require('joi');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

class AddEntity extends BaseHandler {
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
    async checkIfCustomerExists(cid, cuid) {

        console.log("in check customer exists-------");

        let valRes = await dynamodb.get({
            TableName: `customers-${process.env.STAGE}`,
            Key: {
                cid: cid
            },
            ProjectionExpression: 'cid'
        }).promise();
        console.log(valRes);
        if (valRes && 'Item' in valRes && valRes.Item && 'cid' in valRes.Item && valRes.Item.cid) {
            return true;
        } else {
            return false;
        }
    }

    //values insert if customer does not exists
    async createEntity(body) {

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
        try {
            let body = event.body ? JSON.parse(event.body) : event;

            //Validate the input
            //await utils.validate(body, this.getValidationSchema());

            // Check if cid already exists
            let customerExists = await this.checkIfCustomerExists(body.cid, body.cuid);
            this.log.debug("customerExists:" + customerExists);
            if (customerExists) {
                return responseHandler.callbackRespondWithSimpleMessage('400', 'Duplicate customer');
            }

            // Call to insert customer
            //let cuid = await this.createCustomer(body);

            let resp = {
                cid: body.cid,
                cuid: body.cuid,
                message: "Entity Created Successfully"
            }
            return responseHandler.callbackRespondWithSimpleMessage(200, resp);
        }
        catch (err) {
            if (err.message) {
                return responseHandler.callbackRespondWithSimpleMessage(400, err.message);
            } else {
                return responseHandler.callbackRespondWithSimpleMessage(500, 'Internal Server Error')
            }
        }
    };
}

exports.createEntity = async (event, context, callback) => {
    return await new AddEntity().handler(event, context, callback);
}
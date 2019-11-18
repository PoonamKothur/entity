const responseHandler = require("../common/responsehandler");
const BaseHandler = require("../common/basehandler");
const utils = require('../common/utils');
const Joi = require('joi');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const moment = require("moment");

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
            eid: Joi.string().required(),
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

    // This function is used to get customer by cid and cuid
    async checkIfCustomerExists(cid, cuid) {

        var params = {
            //TableName:  `${process.env.STAGE}-customerid`,
            TableName: "customers_test",
            KeyConditionExpression: "#cid = :cidValue and #cuid = :cuidValue",
            ExpressionAttributeNames: {
                "#cid": "cid",
                "#cuid": "cuid"
            },
            ExpressionAttributeValues: {
                ":cidValue": cid,
                ":cuidValue": cuid
            }
        };
        console.log(params);    
        this.log.debug("params---" + JSON.stringify(params));
        let valRes = await dynamodb.query(params).promise();
        this.log.debug("return values of table --- " + JSON.stringify(valRes));

        if (valRes && valRes.Count != 0) {
            this.log.debug("Customer exits");
            return true;
        } else {
            this.log.debug("Customer do not exits");
            return false;
        }
    }

    //values insert in entity table if customer does exists
    async createEntity(body,cuid) {
        const euid = this.generateRandomeuid(2, 6);
        this.log.debug(JSON.stringify(body));
        let item = {
            euid: euid
        };

        if (!utils.isNullOrEmptyKey(body, 'business')) {
            let now = moment();
            body.business.lastUpdate = now.format();
        }
        this.log.debug(`${cuid}-entity`);
        const params = {
            TableName: `${cuid}-entity`,
            Item: Object.assign(item, body)
        };
        this.log.debug(JSON.stringify(params));
        await dynamodb.put(params).promise();
        return euid;
    }

    async process(event, context, callback) {
        try {
            let body = event.body ? JSON.parse(event.body) : event;
            this.log.debug("body----" + JSON.stringify(body));
            let cuid;
            let euid;
            //Validate the input
            await utils.validate(body, this.getValidationSchema());

            //check cuid path param
            if (event && 'pathParameters' in event && event.pathParameters && 'cuid' in event.pathParameters && event.pathParameters.cuid) {
               
                cuid = event.pathParameters.cuid;
            }
            else{
                 return responseHandler.callbackRespondWithSimpleMessage('404', 'Please provide cuid');
            }

            // Check if customer already exists
            let customerExists = await this.checkIfCustomerExists(body.cid, cuid);

            this.log.debug("customerExists:" + customerExists);
            if (customerExists) {
                // Call to insert entity
                 euid = await this.createEntity(body,cuid);
            }
            else {
                return responseHandler.callbackRespondWithSimpleMessage('404', 'Customer does not exists');
            }

            let resp = {
                cid: body.cid,
                cuid: body.cuid,
                euid: euid,
                message: "Entity Created Successfully"
            };
            return responseHandler.callbackRespondWithSimpleMessage(200, resp);
        }
        catch (err) {
            if (err.message) {
                return responseHandler.callbackRespondWithSimpleMessage(400, err.message);
            } else {
                return responseHandler.callbackRespondWithSimpleMessage(500, 'Internal Server Error');
            }
        }
    }
}

exports.createEntity = async (event, context, callback) => {
    return await new AddEntity().handler(event, context, callback);
};
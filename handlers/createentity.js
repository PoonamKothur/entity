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
    async createEntity(data,cuid) {
        const euid = this.generateRandomeuid(2, 6);
        console.log(euid);  
        this.log.debug(JSON.stringify(data));

        if (!utils.isNullOrEmptyKey(data, 'business')) {
            let now = moment();
            data.business.lastUpdate = now.format();
        }
        console.log(`${cuid}-entity`);
        this.log.debug(`entity -${cuid}`);
        let item = {
            euid: euid
        }
        const params = {
            TableName: `entity-${cuid}`,
            Item: Object.assign(item, data)
        };
        console.log(params);
        this.log.debug(JSON.stringify(params));

        let putres = await dynamodb.put(params).promise();
        console.log(putres);
        //return euid;
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
            console.log(customerExists);
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
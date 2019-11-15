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

    // This function is used to get customer by cid
    async checkIfCustomerExists(cid, cuid) {

        console.log("in check customer exists-------");
        console.log('customers_test');
        console.log("cid--" + cid);
        console.log("cuid--- " + cuid);

        var params = {
            TableName: 'customers_test',
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

        console.log("params---" + JSON.stringify(params));

        let valRes = await dynamodb.query(params).promise();

        console.log("return values of table --- " + JSON.stringify(valRes));

        if (valRes.Count != 0) { //TODO 
            //if (valRes && 'Items' in valRes && valRes.Items && 'cuid' in valRes.Items && valRes.Items.cuid) {
            console.log("customer exits");
            return true;
        } else {
            console.log("customer do not exits");
            return false;
        }
    }

    //values insert if customer does not exists
    async createEntity(body) {
        console.log("in create entity------------");
        const euid = this.generateRandomeuid(2, 6);

        console.log (JSON.stringify(body));
        let item = {
            euid: euid
        };

        if (!utils.isNullOrEmptyKey(body, 'secondary')) {
            body.secondary.lastUpdate = moment.utc();
        }
        console.log(`${body.cuid}-entity`);
        const params = {
            TableName: `${body.cuid}-entity`,
            Item: Object.assign(item, body)
        };
        await dynamodb.put(params).promise();

        return euid;
    }

    async process(event, context, callback) {
        try {
            let body = event.body ? JSON.parse(event.body) : event;
           
            console.log("body----" + JSON.stringify(body));

            //Validate the input
            //await utils.validate(body, this.getValidationSchema());

            // Check if cid already exists
            let customerExists = await this.checkIfCustomerExists(body.cid, body.cuid);

            this.log.debug("customerExists:" + customerExists);
            if (customerExists) {
                // Call to insert entity
              let   euid = await this.createEntity(body);
            }
            else { return responseHandler.callbackRespondWithSimpleMessage('404', 'Customer does not exists'); }

            let resp = {
                cid: body.cid,
                cuid: body.cuid,
                //euid: euid, // TODO
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
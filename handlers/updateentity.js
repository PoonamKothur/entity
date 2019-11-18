const responseHandler = require("../common/responsehandler");
const BaseHandler = require("../common/basehandler");
const utils = require('../common/utils');
const Joi = require('joi');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const moment = require("moment");

class UpdateEntitybyId extends BaseHandler {
    //this is main function
    constructor() {
        super();
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

    // This function is used to get customer by cid and cuid
    async checkIfEntityExists(cuid, euid) {
        let valRes = await dynamodb.get({
            TableName: `${cuid}-entity`,
            Key: {
                euid: euid
            },
            ProjectionExpression: 'euid'
        }).promise();
        this.log.debug(JSON.stringify(valRes));
        if (valRes && 'Item' in valRes && valRes.Item && 'euid' in valRes.Item && valRes.Item.euid) {
            return true;
        } else {
            return false;
        }
    }

    async checkIfCustomerExists(cuid, cid) {
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
        let valRes = await dynamodb.query(params).promise();
        this.log.debug("return values of customer table --- " + JSON.stringify(valRes));
        if (valRes && valRes.Count != 0) {
            return true;
        } else {

            return false;
        }
    }

    //update entity by euid
    async updateEntity(cuid, euid, body) {
        let item = {
            euid: euid
        };
        const params = {
            TableName: `entity-${cuid}`,
            Item: Object.assign(item, body)
        };
        //set last update date
        let now = moment();
        body.business.lastUpdate = now.format();
        this.log.debug(JSON.stringify("params--" + JSON.stringify(params)));

        let valRes = await dynamodb.put(params).promise();
        this.log.debug(JSON.stringify(valRes));
        return valRes;
    }

    async process(event, context, callback) {
        try {
            let customerExists;
            let body = event.body ? JSON.parse(event.body) : event;
            
            await utils.validate(body, this.getValidationSchema());
            let cid = body.cid;
            //check for cuid and euid
            if (event && 'pathParameters' in event && event.pathParameters && 'cuid' in event.pathParameters && event.pathParameters.cuid) {
                if (event && 'pathParameters' in event && event.pathParameters && 'euid' in event.pathParameters && event.pathParameters.euid) {
                    //check if customer exists
                    customerExists = await this.checkIfCustomerExists(cuid, cid);
                }
                else {
                    return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide euid");
                }
            }
            else {
                return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide cuid");
            }

            this.log.debug("customerExists:" + customerExists);
            let cuid = event.pathParameters.cuid;
            let euid = event.pathParameters.euid;

            if (customerExists) {
                //check if entity exists
                let entityExists = await this.checkIfEntityExists(cuid, euid);
                console.log(entityExists);
                if (entityExists) {
                    this.log.debug("update entity here");
                    // Call to update entity
                    let entityresp = await this.updateEntity(cuid, euid, body);
                }
                else { return responseHandler.callbackRespondWithSimpleMessage('404', 'Entity does not exists'); }
            }
            else { return responseHandler.callbackRespondWithSimpleMessage('404', 'Customer does not exists'); }

            let resp = {
                cuid: cuid,
                euid: euid,
                message: "Entity Updated Successfully"
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

exports.updateentity = async (event, context, callback) => {
    return await new UpdateEntitybyId().handler(event, context, callback);
};
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
       console.log( `entity-${cuid}`);
        let valRes = await dynamodb.get({
            TableName: `entity-${cuid}`,
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
        console.log(`entity-${cuid}`);
        const params = {
            TableName: `entity-${cuid}`,
            Item: Object.assign(item, body)
        };
        //set last update date
        // let now = moment();
        // let date = now.format();
        // body.business.lastUpdate = date;
        this.log.debug(JSON.stringify("params--" + JSON.stringify(params)));

        let valRes = await dynamodb.put(params).promise();
        this.log.debug(JSON.stringify(valRes));
        return valRes;
    }

    async process(event, context, callback) {
        let body = event.body ? JSON.parse(event.body) : event;
            
        await utils.validate(body, this.getValidationSchema());
        let cid = body.cid;
        //check for cuid and euid
        if (!(event && 'pathParameters' in event && event.pathParameters && 'cuid' in event.pathParameters && event.pathParameters.cuid)) {
            return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide cuid");
        }
        
        if (!(event && 'pathParameters' in event && event.pathParameters && 'euid' in event.pathParameters && event.pathParameters.euid)) {
            return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide euid");
        }
        let cuid = event.pathParameters.cuid;
        let euid = event.pathParameters.euid;

        let customerExists = await this.checkIfCustomerExists(cuid, cid);

        this.log.debug("customerExists:" + customerExists);
       
        if (!customerExists) {
            return responseHandler.callbackRespondWithSimpleMessage('404', 'Customer does not exists');
        }
        //check if entity exists
        let entityExists = await this.checkIfEntityExists(cuid, euid);
        console.log(entityExists);
        if (!entityExists) {
            return responseHandler.callbackRespondWithSimpleMessage('404', 'Entity does not exists'); 
            
        }

        this.log.debug("update entity here");
            // Call to update entity
            let entityresp = await this.updateEntity(cuid, euid, body);
        let resp = {
            cuid: cuid,
            euid: euid,
            message: "Entity Updated Successfully"
        };

        return responseHandler.callbackRespondWithSimpleMessage(200, resp);
    }
}

exports.updateentity = async (event, context, callback) => {
    return await new UpdateEntitybyId().handler(event, context, callback);
};
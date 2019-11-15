const responseHandler = require("../common/responsehandler");
const BaseHandler = require("../common/basehandler");
const utils = require('../common/utils');
const Joi = require('joi');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

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
    async checkIfEntityExists(body) {
        console.log("in entity exits...");
        let valRes = await dynamodb.get({
            TableName: `${body.cuid}-entity`,
            Key: {
                euid: body.euid
            },
            ProjectionExpression: 'euid'
        }).promise();
        console.log(JSON.stringify(valRes));
        if (valRes && 'Item' in valRes && valRes.Item && 'body.euid' in valRes.Item && valRes.Item.euid) {
            return true;
        } else {
            return false;
        }
    }

    async updateCustomer(cid, data) {
        let item = {
            cid: cid
        }
        const params = {
            TableName: `customers-${process.env.STAGE}`,
            Item: Object.assign(item, data)
        };
        console.log(JSON.stringify(data));
        let valRes = await dynamodb.put(params).promise();
        console.log(JSON.stringify(valRes));
        return valRes;
    }

    checkpathparams(event) {
        if (event && 'pathParameters' in event && event.pathParameters && 'cuid' in event.pathParameters && event.pathParameters.cuid) {

            if (event && 'pathParameters' in event && event.pathParameters && 'euid' in event.pathParameters && event.pathParameters.euid) {
                return true;
            }
            else {
                return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide euid");
            }
        }
        else {
            return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide cuid");
        }
    }

    async process(event, context, callback) {
        try {
            let body = event.body ? JSON.parse(event.body) : event;

            //check path parameters
            let paramresp = await checkpathparams(event);
            console.log(paramresp);
            //await utils.validate(body, this.getValidationSchema());

            // //check if customer exists
            // let customerExists = await this.checkIfCustomerExists(body.cid, cuid);

            // this.log.debug("customerExists:" + customerExists);
            // if (customerExists) {
            //     // Call to insert entity
            //     let euid = await this.createEntity(body);
            // }
            // else { return responseHandler.callbackRespondWithSimpleMessage('404', 'Customer does not exists'); }

            // //check if entity exists
            // let entityExists = await this.checkIfEntityExists(body.euid);

            // this.log.debug("entityExists:" + entityExists);
            // console.log("entityExists:" + entityExists);
            // if (!entityExists) {
            //     console.log("call to update entity");
            //     // Call to update entity
            //     //let updateResp = await this.updateCustomer(body.cid, body);

            // }
            // else { return responseHandler.callbackRespondWithSimpleMessage('400', 'Customer not exists'); }

            // let resp = {
            //     cid: body.cid,
            //     message: "Customer Updated Successfully"
            // }

            return responseHandler.callbackRespondWithSimpleMessage(200, resp);
        }
        catch (err) {
            if (err.message) {
                return responseHandler.callbackRespondWithSimpleMessage(400, err.message);
            } else {
                return responseHandler.callbackRespondWithSimpleMessage(500, 'Internal Server Error')
            }
        }
    }
}

exports.updateentity = async (event, context, callback) => {
    return await new UpdateEntitybyId().handler(event, context, callback);
}
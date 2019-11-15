const responseHandler = require("../common/responsehandler");
const BaseHandler = require("../common/basehandler");
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient();

class GetEntitybyId extends BaseHandler {
    //this is main function
    constructor() {
        super();
    }

    async getEntityByEuid(cuid, euid) {
        const params = {
            Key: {
                "euid": euid
            },
            TableName: `${cuid}-entity`
        };
        return await documentClient.get(params).promise();
    }

    async process(event, context, callback) {
        try {
            let body = event.body ? JSON.parse(event.body) : event;

            //check for cuid and euid from route
            if (event && 'pathParameters' in event && event.pathParameters && 'cuid' in event.pathParameters && event.pathParameters.cuid) {

                if (event && 'pathParameters' in event && event.pathParameters && 'euid' in event.pathParameters && event.pathParameters.euid) {

                    let euid = event.pathParameters.euid;
                    let cuid = event.pathParameters.cuid;
                    let res = await this.getEntityByEuid(cuid, euid);

                    if (res && 'Item' in res) {
                        return responseHandler.callbackRespondWithJsonBody(200, res.Item);
                    }
                    return responseHandler.callbackRespondWithSimpleMessage(404, "No customer found !");
                }
                else {
                    return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide euid");
                }
            }
            else {
                return responseHandler.callbackRespondWithSimpleMessage(400, "Please provide cuid");
            }
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

exports.getentity = async (event, context, callback) => {
    return await new GetEntitybyId().handler(event, context, callback);
}
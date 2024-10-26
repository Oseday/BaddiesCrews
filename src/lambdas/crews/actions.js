//@ts-check

import { sendCloudwatchMetric } from "./cloudwatch.js";
//@ts-ignore
import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
//@ts-ignore
import { QueryCommand, PutCommand, DeleteCommand, TransactWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const BaddiesCrewsTableName = process.env.BaddiesCrewsTableName;

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-1" }));

const actions = {};

function addAction(actionName, actionFunction) {
	actions[actionName] = actionFunction;
}

function getAction(actionName) {
	return actions[actionName];
}

async function callAction(actionName, body, headers) {
	const actionFunction = getAction(actionName);
	
	if (!actionFunction) {
		return {
			success: false,
			message: "Invalid action: " + actionName
		}
	}
	
	try {
		return await actionFunction(body, headers);
	} catch (error) {
		console.error(error);

		await sendCloudwatchMetric("ActionError", 1, "Count", [
			{
				Name: "Action",
				Value: actionName,
			},
		]);

		return {
			success: false,
			message: "Error executing action",
			error: error.message
		}
	}
}


addAction("CreateCrew", async (body, headers) => {
    const { name, description } = body;
    
    if (!name) {
        return {
            success: false,
            message: "Missing required field: name"
        }
    }
    
    const crewId = randomUUID();

    // remove dashes from UUID
    const crewIdClean = crewId.replace(/-/g, "");
    
    try {
        await ddbDocClient.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: BaddiesCrewsTableName,
                        Item: {
                            crewId,
                            name,
                            description
                        }
                    }
                }
            ]
        }));
        
        return {
            success: true,
            crewId
        }
    } catch (error) {
        console.error(error);
        
        return {
            success: false,
            message: "Error creating crew",
            error: error.message
        }
    }
}



export { actions, getAction };
//@ts-check
//@ts-ignore

import { getAction } from "./actions.js";
import { sendCloudwatchMetric } from "./cloudwatch.js";

function tryJSONParse(x) {
	try {
		return JSON.parse(x);
	} catch (error) {
		return x;
	}
}

export const handler = async (event) => {
	let body = tryJSONParse(event.body);
	let headers = event.headers;

	if (!body) {
		body = event.queryStringParameters;

		if (typeof body === "string") {
			body = tryJSONParse(body);
		}
	}

	const actionName = body.action;

	if (!actionName) {

		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Missing required parameter action" }),
		};
	}

	const actionFunction = getAction(actionName);

	if (!actionFunction) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "Invalid action: " + actionName }),
		};
	}

	try { 
		const timeStart = process.hrtime.bigint()
		const result = await actionFunction(body, headers);
		const timeEnd = process.hrtime.bigint()

		result.executionTime = (Number((timeEnd - timeStart).toString()) / 1E6).toString() + " ms";
		
		//console.warn({"MarketplaceAPIService Action": actionName, executionTime: result.executionTime});

		/*
		const executionTime = Number(timeEnd - timeStart) / 1E6;
		await sendCloudwatchMetric("ActionTime", executionTime, "Milliseconds", [
			{
				Name: "Action",
				Value: actionName,
			},
		]);
		*/

		if (!result.success) { 
			console.error({"MarketplaceAPIService Action Error": result.error});

			await sendCloudwatchMetric("ActionError", 1, "Count", [
				{
					Name: "Action",
					Value: actionName,
				},
			]);

			return {
				statusCode: result.statusCode || 500,
				body: JSON.stringify(result),
			};
		}

		if (result.directReturn) {
			return result.directReturn;
		}

		return {
			statusCode: 200,
			body: JSON.stringify(result),
		};
	} catch (error) {

		console.error(error);

		await sendCloudwatchMetric("ActionError", 1, "Count", [
			{
				Name: "Action",
				Value: actionName,
			},
		]);

		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error processing request", error: error.message }), 
		};
	}
};
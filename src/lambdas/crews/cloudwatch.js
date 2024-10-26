import cloudwatch from "@aws-sdk/client-cloudwatch";

const cloudwatchClient = new cloudwatch.CloudWatchClient({ region: "us-east-1" });

async function sendCloudwatchMetric(metricName, value, unit, dimensions) {
	try {
		await cloudwatchClient.send(new cloudwatch.PutMetricDataCommand({
			Namespace: "BaddiesCrewsAPIService",
			MetricData: [
				{
					MetricName: metricName,
					Dimensions: dimensions,
					Timestamp: new Date(),
					Value: value,
					Unit: unit,
				},
			],
		}));
	} catch (error) {
		console.error(error);
	}
}

export { sendCloudwatchMetric };
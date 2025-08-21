export interface ILogEntry {
	"@timestamp": number;
	level: "error" | "warn" | "info" | "debug" | "verbose";
	eventId: string;
	extEventId?: string;
	parentId?: string;
	text: string;
	localTime: string;
	stack?: string;
	PID: number;
	workerId?: number;
	appType: string;
	risCode?: string;
	projectCode: string;
	appName: string;
	timestamp: string;
	message?: string;
	envType: string;
	namespace?: string;
	podName?: string;
	tec?: {
		nodeName?: string;
		podIp?: string;
	};
	tslgClientVersion: string;
}

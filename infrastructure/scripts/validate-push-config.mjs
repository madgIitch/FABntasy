const env=process.env;
const required=["NEXT_PUBLIC_VAPID_PUBLIC_KEY","VAPID_PRIVATE_KEY","VAPID_SUBJECT","VAPID_KEY_VERSION","CANASTIO_PUSH_JOB_SECRET"];
for(const name of required)if(!env[name])throw new Error(`PUSH_CONFIG_MISSING:${name}`);
if(!/^[A-Za-z0-9_-]{80,100}$/.test(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY))throw new Error("PUSH_CONFIG_INVALID:PUBLIC_KEY");
if(!/^[A-Za-z0-9_-]{40,60}$/.test(env.VAPID_PRIVATE_KEY))throw new Error("PUSH_CONFIG_INVALID:PRIVATE_KEY");
let validSubject=false;
if(env.VAPID_SUBJECT.startsWith("mailto:"))validSubject=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VAPID_SUBJECT.slice(7));
else try{const subject=new URL(env.VAPID_SUBJECT);validSubject=subject.protocol==="https:"&&Boolean(subject.hostname)&&!subject.username&&!subject.password}catch{}
if(!validSubject)throw new Error("PUSH_CONFIG_INVALID:SUBJECT");
if(!/^[A-Za-z0-9._-]{1,32}$/.test(env.VAPID_KEY_VERSION))throw new Error("PUSH_CONFIG_INVALID:KEY_VERSION");
if(env.CANASTIO_PUSH_JOB_SECRET.length<32)throw new Error("PUSH_CONFIG_INVALID:JOB_SECRET");
process.stdout.write("Push production configuration is valid (values redacted).\n");

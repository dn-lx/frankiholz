import type {ReactNode} from 'react';
export function SectionHeading({eyebrow,title,subtitle,inverse=false,aside}:{eyebrow:string;title:string;subtitle?:string;inverse?:boolean;aside?:ReactNode}){
 return <div className={'section-heading-v2'+(inverse?' is-inverse':'')}><div><span className="micro-label">{eyebrow}</span><h2>{title}</h2></div>{aside||subtitle?<div className="section-heading-aside">{aside||<p>{subtitle}</p>}</div>:null}</div>;
}

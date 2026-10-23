'use client';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
export function Dialog({title,close,children,className=''}:{title:string;close:()=>void;children:React.ReactNode;className?:string}) {
  const ref=useRef<HTMLDialogElement>(null),label=useId();
  useEffect(()=>{
    const dialog=ref.current;if(!dialog)return;
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.showModal();
    return()=>{dialog.close();document.body.style.overflow=overflow;previous?.focus({preventScroll:true});};
  },[]);
  return <dialog ref={ref} className={'content-dialog '+className} aria-labelledby={label} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
    <div className="dialog-inner"><header><h2 id={label}>{title}</h2><button type="button" className="icon-button" aria-label="Close / Schließen" onClick={close}><X/></button></header>{children}</div>
  </dialog>;
}

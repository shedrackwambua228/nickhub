import {Icon} from "./icon";import s from "./landing.module.css";
export function Logo(){return <a className={s.logo} href="#top" aria-label="NickHub home"><span className={s.logoMark}><Icon name="bolt"/></span><span className={s.wordmark}>NICKHUB<small>distribution</small></span></a>}

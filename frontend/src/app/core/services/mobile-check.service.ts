import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MobileCheckService {

  constructor() { }

  isMobile(){
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile/i.test(navigator.userAgent) &&
      'ontouchstart' in window
    );
  }
}

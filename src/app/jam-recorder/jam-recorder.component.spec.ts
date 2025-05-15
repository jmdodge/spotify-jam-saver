import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JamRecorderComponent } from './jam-recorder.component';

describe('JamRecorderComponent', () => {
  let component: JamRecorderComponent;
  let fixture: ComponentFixture<JamRecorderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JamRecorderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JamRecorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

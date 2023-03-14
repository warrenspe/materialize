import { Component } from "./component";
import { M } from "./global";
import $ from "cash-dom";
import anim from "animejs";

  let _defaults = {
    indicators: true,
    height: 400,
    duration: 500,
    interval: 6000,
    pauseOnFocus: true,
    pauseOnHover: true,
    indicatorLabelFunc: null // Function which will generate a label for the indicators (ARIA)
  };

  export class Slider extends Component {
    $slider: any;
    $slides: any;
    activeIndex: any;
    $active: any;
    $indicators: any;
    private _handleIntervalBound: any;
    private _handleIndicatorClickBound: any;
    interval: string | number | NodeJS.Timeout;
    eventPause: any;
    _hovered: any;
    _focused: any;
    _focusCurrent: any;
    _sliderId: any;
    private _handleAutoPauseFocusBound: any;
    private _handleAutoStartFocusBound: any;
    private _handleAutoPauseHoverBound: any;
    private _handleAutoStartHoverBound: any;

    constructor(el, options) {
      super(Slider, el, options);
      (this.el as any).M_Slider = this;
      this.options = {...Slider.defaults, ...options};

      // init props
      this.interval = null;
      this.eventPause = false;
      this._hovered = false;
      this._focused = false;
      this._focusCurrent = false;

      // setup
      this.$slider = this.$el.find('.slides');
      this.$slides = this.$slider.children('li');
      
      this.activeIndex = this.$slides
        .filter(function(item) {
          return $(item).hasClass('active');
        })
        .first()
        .index();

      if (this.activeIndex != -1) {
        this.$active = this.$slides.eq(this.activeIndex);
      }

      this._setSliderHeight();

      // Sets element id if it does not have one
      if (this.$slider.attr('id')) this._sliderId = this.$slider.attr('id');
      else {
        this._sliderId = 'slider-' + M.guid();
        this.$slider.attr('id', this._sliderId);
      }

      // Set initial positions of captions
      this.$slides.find('.caption').each((i, el) => {
        this._animateCaptionIn(el, 0);
      });

      // Move img src into background-image
      this.$slides.find('img').each((i, el) => {
        let placeholderBase64 =
          'data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        if ($(el).attr('src') !== placeholderBase64) {
          $(el).css('background-image', 'url("' + $(el).attr('src') + '")');
          $(el).attr('src', placeholderBase64);
        }
      });

      this.$slides.each((el) => {
        // Sets slide as focusable by code
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', -1);
        // Removes initial visibility from "inactive" slides
        el.style.visibility = 'hidden';
      });

      this._setupIndicators();

      // Show active slide
      if (this.$active) {
        this.$active.css('display', 'block').css('visibility', 'visible');
      } else {
        this.$slides.first().addClass('active');
        anim({
          targets: this.$slides.first()[0],
          opacity: 1,
          duration: this.options.duration,
          easing: 'easeOutQuad'
        });
        this.$slides.first().css('visibility', 'visible');

        this.activeIndex = 0;
        this.$active = this.$slides.eq(this.activeIndex);

        // Update indicators
        if (this.options.indicators) {
          this.$indicators.eq(this.activeIndex).children().first().addClass('active');
        }
      }

      // Adjust height to current slide
      this.$active.find('img').each((el) => {
        anim({
          targets: this.$active.find('.caption')[0],
          opacity: 1,
          translateX: 0,
          translateY: 0,
          duration: this.options.duration,
          easing: 'easeOutQuad'
        });
      });

      this._setupEventHandlers();
      // auto scroll
      this.start();
    }

    static get defaults() {
      return _defaults;
    }

    static init(els, options) {
      return super.init(this, els, options);
    }

    static getInstance(el) {
      let domElem = !!el.jquery ? el[0] : el;
      return domElem.M_Slider;
    }

    destroy() {
      this.pause();
      this._removeIndicators();
      this._removeEventHandlers();
      (this.el as any).M_Slider = undefined;
    }

    _setupEventHandlers() {
      this._handleIntervalBound = this._handleInterval.bind(this);
      this._handleIndicatorClickBound = this._handleIndicatorClick.bind(this);
      this._handleAutoPauseFocusBound = this._handleAutoPauseFocus.bind(this);
      this._handleAutoStartFocusBound = this._handleAutoStartFocus.bind(this);
      this._handleAutoPauseHoverBound = this._handleAutoPauseHover.bind(this);
      this._handleAutoStartHoverBound = this._handleAutoStartHover.bind(this);
      if (this.options.pauseOnFocus) {
        this.el.addEventListener('focusin', this._handleAutoPauseFocusBound);
        this.el.addEventListener('focusout', this._handleAutoStartFocusBound);
      }
      if (this.options.pauseOnHover) {
        this.el.addEventListener('mouseenter', this._handleAutoPauseHoverBound);
        this.el.addEventListener('mouseleave', this._handleAutoStartHoverBound);
      }
      if (this.options.indicators) {
        this.$indicators.each((i, el) => {
          el.addEventListener('click', this._handleIndicatorClickBound);
        });
      }
    }

    _removeEventHandlers() {
      if (this.options.pauseOnFocus) {
        this.el.removeEventListener('focusin', this._handleAutoPauseFocusBound);
        this.el.removeEventListener('focusout', this._handleAutoStartFocusBound);
      }
      if (this.options.pauseOnHover) {
        this.el.removeEventListener('mouseenter', this._handleAutoPauseHoverBound);
        this.el.removeEventListener('mouseleave', this._handleAutoStartHoverBound);
      }
      if (this.options.indicators) {
        this.$indicators.each((i, el) => {
          el.removeEventListener('click', this._handleIndicatorClickBound);
        });
      }
    }

    _handleIndicatorClick(e) {
      let currIndex = $(e.target).parent().index();
      this._focusCurrent = true;
      this.set(currIndex);
    }

    _handleAutoPauseHover() {
      this._hovered = true;
      if (this.interval != null) {
        this._pause(true);
      }
    }

    _handleAutoPauseFocus() {
      this._focused = true;
      if (this.interval != null) {
        this._pause(true);
      }
    }

    _handleAutoStartHover() {
      this._hovered = false;
      if (!(this.options.pauseOnFocus && this._focused) && this.eventPause) {
        this.start();
      }
    }

    _handleAutoStartFocus() {
      this._focused = false;
      if (!(this.options.pauseOnHover && this._hovered) && this.eventPause) {
        this.start();
      }
    }

    _handleInterval() {
      let newActiveIndex = this.$slider.find('.active').index();
      if (this.$slides.length === newActiveIndex + 1) newActiveIndex = 0;
      // loop to start
      else newActiveIndex += 1;

      this.set(newActiveIndex);
    }

    _animateCaptionIn(caption: Element, duration: number) {
      let animOptions = {
        targets: caption,
        opacity: 0,
        duration: duration,
        translateX: null,
        translateY: null,
        easing: 'easeOutQuad'
      };
      if ($(caption).hasClass('center-align')) {
        animOptions.translateY = -100;
      } else if ($(caption).hasClass('right-align')) {
        animOptions.translateX = 100;
      } else if ($(caption).hasClass('left-align')) {
        animOptions.translateX = -100;
      }
      anim(animOptions);
    }

    _setSliderHeight() {
      // If fullscreen, do nothing
      if (!this.$el.hasClass('fullscreen')) {
        if (this.options.indicators) {
          // Add height if indicators are present
          this.$el.css('height', this.options.height + 40 + 'px');
        } else {
          this.$el.css('height', this.options.height + 'px');
        }
        this.$slider.css('height', this.options.height + 'px');
      }
    }

    _setupIndicators() {
      if (this.options.indicators) {
        this.$indicators = $('<ul class="indicators"></ul>');

        this.$slides.each((el, i) => {
          let label = this.options.indicatorLabelFunc
            ? this.options.indicatorLabelFunc.call(this, i + 1, i === 0)
            : `${i + 1}`;
          let $indicator = $(`<li class="indicator-item">
            <button type="button" class="indicator-item-btn" aria-label="${label}" aria-controls="${this._sliderId}"></button>
          </li>`);

          this.$indicators.append($indicator[0]);
        });
        this.$el.append(this.$indicators[0]);
        this.$indicators = this.$indicators.children('li.indicator-item');
      }
    }

    _removeIndicators() {
      this.$el.find('ul.indicators').remove();
    }

    set(index: number) {
      // Wrap around indices.
      if (index >= this.$slides.length) index = 0;
      else if (index < 0) index = this.$slides.length - 1;

      // Only do if index changes
      if (this.activeIndex != index) {
        this.$active = this.$slides.eq(this.activeIndex);
        let $caption = this.$active.find('.caption');
        this.$active.removeClass('active');
        // Enables every slide
        this.$slides.css('visibility', 'visible');

        anim({
          targets: this.$active[0],
          opacity: 0,
          duration: this.options.duration,
          easing: 'easeOutQuad',
          complete: () => {
            this.$slides.not('.active').each((i, el) => {
              anim({
                targets: el,
                opacity: 0,
                translateX: 0,
                translateY: 0,
                duration: 0,
                easing: 'easeOutQuad'
              });
              // Disables invisible slides (for assistive technologies)
              el.style.visibility = 'hidden';
            });
          }
        });

        this._animateCaptionIn($caption[0], this.options.duration);

        // Update indicators
        if (this.options.indicators) {
          let activeIndicator = this.$indicators
            .eq(this.activeIndex)
            .children()
            .first();
          let nextIndicator = this.$indicators
            .eq(index)
            .children()
            .first();
          activeIndicator.removeClass('active');
          nextIndicator.addClass('active');
          if (typeof this.options.indicatorLabelFunc === "function"){
            activeIndicator.attr(
              'aria-label',
              this.options.indicatorLabelFunc.call(
                this,
                this.$indicators.eq(this.activeIndex).index(),
                false
              )
            );
            nextIndicator.attr(
              'aria-label',
              this.options.indicatorLabelFunc.call(
                this,
                this.$indicators.eq(index).index(),
                true
              )
            );
          }
        }

        anim({
          targets: this.$slides.eq(index)[0],
          opacity: 1,
          duration: this.options.duration,
          easing: 'easeOutQuad'
        });

        anim({
          targets: this.$slides.eq(index).find('.caption')[0],
          opacity: 1,
          translateX: 0,
          translateY: 0,
          duration: this.options.duration,
          delay: this.options.duration,
          easing: 'easeOutQuad'
        });

        this.$slides.eq(index).addClass('active');
        if (this._focusCurrent) {
          this.$slides.eq(index)[0].focus();
          this._focusCurrent = false;
        }
        this.activeIndex = index;

        // Reset interval, if allowed. This check prevents autostart
        // when slider is paused, since it can be changed though indicators.
        if (this.interval != null) {
          this.start();
        }
      }
    }

    _pause(fromEvent: boolean) {
      clearInterval(this.interval);
      this.eventPause = fromEvent;
      this.interval = null;
    }

    pause() {
      this._pause(false);
    }

    start() {
      clearInterval(this.interval);
      this.interval = setInterval(
        this._handleIntervalBound,
        this.options.duration + this.options.interval
      );
      this.eventPause = false;
    }

    next() {
      let newIndex = this.activeIndex + 1;
      // Wrap around indices.
      if (newIndex >= this.$slides.length) newIndex = 0;
      else if (newIndex < 0) newIndex = this.$slides.length - 1;
      this.set(newIndex);
    }

    prev() {
      let newIndex = this.activeIndex - 1;
      // Wrap around indices.
      if (newIndex >= this.$slides.length) newIndex = 0;
      else if (newIndex < 0) newIndex = this.$slides.length - 1;
      this.set(newIndex);
    }
  }
  

  
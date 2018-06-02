/*
 * Copyright 2018 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  var player = Nuvola.$object(Nuvola.MediaPlayer)

  var PlaybackState = Nuvola.PlaybackState
  var PlayerAction = Nuvola.PlayerAction

  var WebApp = Nuvola.$WebApp()

  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    var state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  WebApp._onPageReady = function () {
    Nuvola.actions.connect('ActionActivated', this)
    this.update()
  }

  WebApp.update = function () {
    var track = {
      title: (
        Nuvola.queryText('.nowPlayingTopInfo__current .Marquee__wrapper__content') ||
        Nuvola.queryText('.Tuner .Tuner__Audio__TrackDetail__title')),
      artist: (
        Nuvola.queryText('.nowPlayingTopInfo__current .nowPlayingTopInfo__current__artistName') ||
        Nuvola.queryText('.Tuner .Tuner__Audio__TrackDetail__artist')),
      album: Nuvola.queryText('.nowPlayingTopInfo__current .nowPlayingTopInfo__current__albumName'),
      artLocation: null,
      rating: null
    }

    var elms = this._getElements()

    player.setTrack(track)
    player.setPlaybackState(elms.state)
    player.setCanGoPrev(!!elms.replay)
    player.setCanGoNext(!!elms.skip)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    var elms = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (elms.play) {
          Nuvola.clickOnElement(elms.play)
        } else if (elms.pause) {
          Nuvola.clickOnElement(elms.pause)
        }
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(elms.play)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        Nuvola.clickOnElement(elms.pause)
        break
      case PlayerAction.PREV_SONG:
        Nuvola.clickOnElement(elms.replay)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(elms.skip)
        break
    }
  }

  WebApp._getElements = function () {
    var elms = {
      play: document.querySelector('.PlayButton'),
      pause: null,
      skip: document.querySelector('.SkipButton'),
      replay: document.querySelector('.ReplayButton'),
    }
    for (var key in elms) {
      if (elms[key] && elms[key].disabled) {
        elms[key] = null
      }
    }
    if (elms.play && elms.play.getAttribute('data-qa') === 'pause_button') {
      elms.pause = elms.play
      elms.play = null
    }
    elms.state = elms.play ? PlaybackState.PAUSED : (elms.pause ? PlaybackState.PLAYING : PlaybackState.UNKNOWN)
    return elms
  }

  WebApp.start()
})(this)  // function(Nuvola)

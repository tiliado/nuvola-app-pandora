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
  const player = Nuvola.$object(Nuvola.MediaPlayer)

  const PlaybackState = Nuvola.PlaybackState
  const PlayerAction = Nuvola.PlayerAction
  const C_ = Nuvola.Translate.pgettext

  const ACTION_THUMBS_UP = 'thumbs-up'
  const ACTION_THUMBS_DOWN = 'thumbs-down'

  const WebApp = Nuvola.$WebApp()

  WebApp._onInitAppRunner = function (emitter) {
    Nuvola.WebApp._onInitAppRunner.call(this, emitter)

    Nuvola.actions.addAction('playback', 'win', ACTION_THUMBS_UP, C_('Action', 'Thumbs up'),
      null, null, null, false)
    Nuvola.actions.addAction('playback', 'win', ACTION_THUMBS_DOWN, C_('Action', 'Thumbs down'),
      null, null, null, false)
  }

  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    const state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  WebApp._onPageReady = function () {
    Nuvola.actions.connect('ActionActivated', this)
    player.addExtraActions([ACTION_THUMBS_UP, ACTION_THUMBS_DOWN])
    this.update()
  }

  WebApp.update = function () {
    const track = {
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

    const time = this._getTime()
    track.length = time ? time[1].textContent || null : null

    const elms = this._getElements()
    player.setTrack(track)
    player.setPlaybackState(elms.state)
    player.setCanGoPrev(!!elms.replay)
    player.setCanGoNext(!!elms.skip)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)
    player.setCanSeek(false)
    player.setCanChangeVolume(!!elms.volume[2])

    const actionsEnabled = {}
    const actionsStates = {}
    actionsEnabled[ACTION_THUMBS_UP] = !!elms.like
    actionsStates[ACTION_THUMBS_UP] = elms.like && elms.like.getAttribute('aria-checked') === 'true'
    actionsEnabled[ACTION_THUMBS_DOWN] = !!elms.dislike
    actionsStates[ACTION_THUMBS_DOWN] = elms.dislike && elms.dislike.getAttribute('aria-checked') === 'true'
    Nuvola.actions.updateEnabledFlags(actionsEnabled)
    Nuvola.actions.updateStates(actionsStates)

    player.setTrackPosition(time ? time[0].textContent || null : null)
    player.updateVolume(Nuvola.queryAttribute(
      '.VolumeDurationControl .VolumeSlider__Handle__HitBox', 'aria-valuenow', (value) => value / 100))

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    const elms = this._getElements()
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
      case ACTION_THUMBS_UP:
        Nuvola.clickOnElement(elms.like)
        break
      case ACTION_THUMBS_DOWN:
        Nuvola.clickOnElement(elms.dislike)
        break
      case PlayerAction.CHANGE_VOLUME:
        if (elms.volume[0]) {
          elms.volume[0].classList.add('VolumeDurationControl__Duration--leftShift')
        }
        if (elms.volume[1]) {
          elms.volume[1].classList.add('VolumeDurationControl__VolumeSlider--visible')
        }
        if (elms.volume[2]) {
          Nuvola.clickOnElement(elms.volume[2], param, 0.5)
        }
        break
    }
  }

  WebApp._getElements = function () {
    const elms = {
      play: document.querySelector('.PlayButton'),
      pause: null,
      skip: document.querySelector('.SkipButton'),
      replay: document.querySelector('.ReplayButton'),
      dislike: document.querySelector('.ThumbDownButton'),
      like: document.querySelector('.ThumbUpButton'),
      volume: [
        document.querySelector('.VolumeDurationControl .Duration'),
        document.querySelector('.VolumeDurationControl .VolumeSlider'),
        document.querySelector('.VolumeDurationControl .VolumeSlider__ClickTracker')
      ]
    }
    for (const key in elms) {
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

  WebApp._getTime = function () {
    const elm = document.querySelector('.VolumeDurationControl .Duration')
    if (elm && elm.childNodes.length === 3) {
      return [elm.childNodes[0], elm.childNodes[2]]
    }
    return null
  }

  WebApp.start()
})(this) // function(Nuvola)

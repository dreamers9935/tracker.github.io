import '../styles/search.scss';

import {
  STATE_CODES_ARRAY,
  STATE_CODES,
  STATE_NAMES,
  UNASSIGNED_STATE_CODE,
  UNKNOWN_DISTRICT_KEY,
} from '../constants';

import {DotFillIcon, XIcon, SearchIcon} from '@primer/octicons-react';
import produce from 'immer';
import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import {useDebounce, useUpdateEffect} from 'react-use';

const suggestions = [
  'Madurai',
  'Karnataka',
  'Ladakh',
  'Mumbai',
  'Andhra Pradesh',
  'Alappuzha',
];

const districtSuggestions = [
  'Madurai',
  'Ganjam',
  'Alappuzha',
  'Mumbai',
  'Chennai',
];

const stateSuggestions = [
  'Andhra Pradesh',
  'Karnataka',
  'Gujarat',
  'West Bengal',
  'Ladakh',
];

function Search() {
  const [searchValue, setSearchValue] = useState('');
  const [expand, setExpand] = useState(false);
  const [results, setResults] = useState([]);
  const searchInput = useRef(null);
  const {t} = useTranslation();

  const [engine, setEngine] = useState(null);
  const [districtEngine, setDistrictEngine] = useState(null);

  useUpdateEffect(() => {
    import('corejs-typeahead').then((Bloodhound) => {
      setEngine(
        // eslint-disable-next-line
        new Bloodhound.default({
          initialize: true,
          local: STATE_CODES_ARRAY.filter(
            ({code}) => code !== UNASSIGNED_STATE_CODE
          ),
          queryTokenizer: Bloodhound.default.tokenizers.whitespace,
          datumTokenizer: Bloodhound.default.tokenizers.obj.whitespace('name'),
        })
      );

      setDistrictEngine(
        // eslint-disable-next-line
        new Bloodhound.default({
          initialize: true,
          limit: 5,
          queryTokenizer: Bloodhound.default.tokenizers.whitespace,
          datumTokenizer: Bloodhound.default.tokenizers.obj.whitespace(
            'district'
          ),
          indexRemote: true,
          remote: {
            url: 'https://api.covid19india.org/state_district_wise.json',
            transform: function (response) {
              const districts = [];
              Object.keys(response)
                .filter((stateName) => stateName !== 'State Unassigned')
                .map((stateName) => {
                  const districtData = response[stateName].districtData;
                  Object.keys(districtData)
                    .filter(
                      (districtName) => districtName !== UNKNOWN_DISTRICT_KEY
                    )
                    .map((districtName) => {
                      return districts.push({
                        district: districtName,
                        state: stateName,
                      });
                    });
                  return null;
                });
              return districts;
            },
          },
        })
      );
    });
  }, [expand]);

  const handleSearch = useCallback(
    (searchInput) => {
      if (!engine) return null;
      const results = [];

      const sync = (datums) => {
        datums.map((result, index) => {
          const stateObj = {
            name: result.name,
            type: 'state',
            route: result.code,
          };
          results.push(stateObj);
          return null;
        });
      };

      const districtSync = (datums) => {
        datums.slice(0, 3).map((result, index) => {
          const districtObj = {
            name: result.district,
            type: 'district',
            route: STATE_CODES[result.state],
          };
          results.push(districtObj);
          return null;
        });

        setResults([...results]);
      };

      engine.search(searchInput, sync);
      districtEngine.search(searchInput, districtSync);
    },
    [districtEngine, engine]
  );

  useDebounce(
    () => {
      if (searchValue) {
        handleSearch(searchValue);
      } else {
        setResults(
          produce(results, (draftResults) => {
            draftResults.splice(0);
          })
        );
      }
    },
    100,
    [searchValue]
  );

  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(
      prototype,
      'value'
    ).set;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else {
      valueSetter.call(element, value);
    }
  }

  const fillPlaceholder = useCallback(
    (target, index, cursorPosition, callback) => {
      if (expand) {
        target.textContent = '';
        return true;
      }
      const text = t(suggestions[index]);
      const placeholder = target.textContent;
      target.classList.remove('disappear');
      target.textContent = placeholder + text[cursorPosition];
      if (cursorPosition < text.length - 1) {
        setTimeout(function () {
          fillPlaceholder(target, index, cursorPosition + 1, callback);
        }, 200);
        return true;
      }
      callback();
    },
    [expand, t]
  );

  const clearPlaceholder = useCallback((target, callback) => {
    const placeholder = target.textContent;
    target.classList.add('disappear');
    if (placeholder.length > 0) {
      setTimeout(function () {
        target.textContent = '';
        clearPlaceholder(target, callback);
      }, 1000);
      return true;
    }
    callback();
  }, []);

  const loopThroughSuggestions = useCallback(
    (target, index) => {
      if (expand) {
        target.textContent = '';
        return true;
      }

      fillPlaceholder(target, index, 0, function () {
        setTimeout(function () {
          clearPlaceholder(target, function () {
            loopThroughSuggestions(target, (index + 1) % suggestions.length);
          });
        }, 2000);
      });
    },
    [clearPlaceholder, expand, fillPlaceholder]
  );

  useEffect(() => {
    if (!expand) {
      const targetInput = document.getElementsByClassName(
        'search-placeholder'
      )[0];

      if (targetInput) {
        loopThroughSuggestions(targetInput, 0);
      }
    }
  }, [expand, loopThroughSuggestions]);

  const trail = useMemo(() => {
    const styles = [];

    [0, 0, 0].map((element, index) => {
      styles.push({
        animationDelay: `${index * 250}ms`,
      });
      return null;
    });
    return styles;
  }, []);

  const handleClose = useCallback(() => {
    setSearchValue('');
    setResults([]);
  }, []);

  const handleChange = useCallback((event) => {
    setSearchValue(event.target.value);
  }, []);

  return (
    <div className="search">
      <label className="label fadeInUp" style={trail[0]}>
        {t('Search your district or state')}
      </label>

      <div className="line fadeInUp" style={trail[1]}></div>

      <div className="search-input-wrapper fadeInUp" style={trail[2]}>
        <input
          type="text"
          value={searchValue}
          ref={searchInput}
          className="search-input"
          onFocus={setExpand.bind(this, true)}
          onBlur={setExpand.bind(this, false)}
          onChange={handleChange}
        />

        {!expand && searchValue === '' && (
          <span className="search-placeholder"></span>
        )}

        <div className={`search-icon`}>
          <SearchIcon size={22} />
        </div>

        {searchValue.length > 0 && (
          <div className={`close-button`} onClick={handleClose}>
            <XIcon />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="results">
          {results.map((result, index) => (
            <Link className="result" key={index} to={`state/${result.route}`}>
              <div className="result-left">
                <div className="result-name">
                  {`${result.name}`}
                  {result.type === 'district' &&
                    `, ${STATE_NAMES[result.route]}`}
                </div>
              </div>
              <div className="result-right">
                <abbr className="abbr">{[result.route]}</abbr>
              </div>
            </Link>
          ))}
        </div>
      )}

      {expand && (
        <React.Fragment>
          <div className="expanded">
            <div className="expanded-left">
              <h6 className="title">{t('District')}</h6>
              <div className="suggestions">
                {districtSuggestions.map((suggestion, index) => (
                  <div className="suggestion" key={index}>
                    <DotFillIcon size={9} />
                    <div
                      className="text"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setNativeValue(searchInput.current, suggestion);
                        searchInput.current.dispatchEvent(
                          new Event('input', {bubbles: true})
                        );
                      }}
                    >
                      {t(suggestion)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="expanded-right">
              <h6 className="title">{t('State/UT')}</h6>
              <div className="suggestions">
                {stateSuggestions.map((suggestion, index) => (
                  <div className="suggestion" key={index}>
                    <DotFillIcon size={9} />
                    <div
                      className="text"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setNativeValue(searchInput.current, suggestion);
                        searchInput.current.dispatchEvent(
                          new Event('input', {bubbles: true})
                        );
                      }}
                    >
                      {t(suggestion)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

const isEqual = () => {
  return true;
};

export default React.memo(Search, isEqual);

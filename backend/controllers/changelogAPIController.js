const changelogAPIController = {};
const axios = require('axios');
const { patch } = require('../routes/api');
const URL = 'https://changelogs.md/api/github/';

// slow because promises can't run concurrently, but it works!
changelogAPIController.get = (req, res, next) => {
  console.log('getting changelog');
  const { list } = res.locals;
  res.locals.newList = [];

  // get the changelogs for every project
  Promise.all(
    list.map(package => {
      const { name, version, repoOwner, repoName, github } = package;
      return axios
        .get(`${URL}${repoOwner.toLowerCase()}/${repoName.toLowerCase()}`)
        .then(response => {
          const changes = filterOldChanges(
            package.version,
            response.data.contents
          );
          changes.latestVersion = response.data.contents[0].version;

          res.locals.newList.push({
            name,
            version,
            repoOwner,
            repoName,
            github,
            changes,
          });
        });
    })
  )
    .then(() => next())
    .catch(err => next(err));
};

function filterOldChanges(version, changelog) {
  const newChanges = {
    changelog: [],
    wereThereChanges: {
      major: false,
      minor: false,
      patch: false,
    },
  };
  const [myMajor, myMinor, myPatch] = parseVersionNumber(version);
  // console.log(changelog);

  for (const update of changelog) {
    const [updateMajor, updateMinor, updatePatch] = parseVersionNumber(
      update.version
    );

    if (updateMajor > myMajor) {
      newChanges.wereThereChanges.major = true;
      newChanges.changelog.push(update);
    } else if (updateMinor > myMinor) {
      newChanges.wereThereChanges.minor = true;
      newChanges.changelog.push(update);
    } else if (updatePatch > myPatch) {
      newChanges.wereThereChanges.patch = true;
      newChanges.changelog.push(update);
    } else {
      break;
    }
  }
  // console.log('new changes', newChanges);

  return newChanges;
}

/**
 * It takes a string like "1.2.3" and returns an array of numbers like [1, 2, 3]
 * @param versionStr - The version string to parse.
 * @returns An array of numbers.
 */
function parseVersionNumber(versionStr) {
  return versionStr.split('.').map(numStr => Number(numStr));
}

console.log(parseVersionNumber('1.10.18'));

module.exports = changelogAPIController;

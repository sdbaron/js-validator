describe("Check validator checker creating", function() {
  var checker,
      isValidChecker = function(value){
        return value == 'good';
      };

  beforeEach(function() {
    checker = new MC.Common.Validator.Checker(isValidChecker, true);
  });

  it("should be able check immediately", function() {
    expect(checker.shouldCheckImmediately).not.toBeUndefined();
    expect(checker.shouldCheckImmediately).toEqual(true);
  });

  it("should true if check value 'good'", function() {
    expect(checker.doCheck('good')).toEqual(true);
  });

  it("should true if check value 'false'", function() {
    expect(checker.doCheck('bad')).toBeFalsy()
  });

  //
  ////demonstrates use of expected exceptions
  //describe("#resume", function() {
  //  it("should throw an exception if song is already playing", function() {
  //    player.play(song);
  //
  //    expect(function() {
  //      player.resume();
  //    }).toThrowError("song is already playing");
  //  });
  //});
});
